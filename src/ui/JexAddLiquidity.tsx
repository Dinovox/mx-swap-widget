import React from "react";
import BigNumber from "bignumber.js";
import { useTranslation } from "react-i18next";
import { Address, Transaction } from "@multiversx/sdk-core";
import { GAS_PRICE } from "@multiversx/sdk-dapp/out/constants/mvx.constants";
import { useSwapConfig } from "../context/SwapConfigContext";
import { signAndSendTransactions } from "../helpers/signAndSendTransactions";
import { estimateGasLimit } from "../helpers/estimateGas";
import bigToHex from "../helpers/bigToHex";
import strToHex from "../helpers/strToHex";
import type { LiquidityPool } from "../types";

// addLiquidity on a JEXchange pair (reverse-engineered from on-chain txs, the
// contract isn't open source):
//   MultiESDTNFTTransfer (receiver = sender) to the pair, tokenA then tokenB in
//   the pair's order, then addLiquidity@minFirst@minSecond. The pair takes
//   amounts at the current ratio and refunds the excess of one side.
const ADD_GAS_FALLBACK = 8_000_000; // simulated at ~5.5M (JEX/WEGLD); JEXchange's own UI sends 20M
const SLIPPAGE_BPS = 100n; // 1% — min amounts actually taken by the pair

interface Props {
  pool: LiquidityPool;
  tickerA: string;
  tickerB: string;
  decimalsA: number;
  decimalsB: number;
  /** Raw wallet balances of tokenA / tokenB ("0" when not held). */
  balanceA: string;
  balanceB: string;
  onSent?: () => void;
}

/** Inline "add liquidity" form for a JEXchange pool: two ratio-linked inputs. */
export function JexAddLiquidity({ pool, tickerA, tickerB, decimalsA, decimalsB, balanceA, balanceB, onSent }: Props) {
  const { t } = useTranslation("swap");
  const { address, networkApiAddress, chainId, onSignTransactions } = useSwapConfig();
  const [amountA, setAmountA] = React.useState("");
  const [amountB, setAmountB] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const rA = new BigNumber(pool.reserveA);
  const rB = new BigNumber(pool.reserveB);
  const supply = new BigNumber(pool.lpSupply);
  const hasRatio = rA.gt(0) && rB.gt(0);

  // Typing one side fills the other at the pool's current ratio.
  const onA = (v: string) => {
    setAmountA(v);
    const raw = new BigNumber(v).shiftedBy(decimalsA);
    setAmountB(hasRatio && raw.gt(0) ? raw.times(rB).div(rA).integerValue(BigNumber.ROUND_DOWN).shiftedBy(-decimalsB).toFixed() : "");
  };
  const onB = (v: string) => {
    setAmountB(v);
    const raw = new BigNumber(v).shiftedBy(decimalsB);
    setAmountA(hasRatio && raw.gt(0) ? raw.times(rA).div(rB).integerValue(BigNumber.ROUND_DOWN).shiftedBy(-decimalsA).toFixed() : "");
  };

  const rawA = new BigNumber(amountA || 0).shiftedBy(decimalsA).integerValue(BigNumber.ROUND_DOWN);
  const rawB = new BigNumber(amountB || 0).shiftedBy(decimalsB).integerValue(BigNumber.ROUND_DOWN);
  const insufficientA = rawA.gt(balanceA);
  const insufficientB = rawB.gt(balanceB);
  const lpOut = hasRatio && supply.gt(0) && rawA.gt(0) && rawB.gt(0) ? BigNumber.min(rawA.times(supply).div(rA), rawB.times(supply).div(rB)) : null;
  const canSubmit = !!address && hasRatio && rawA.gt(0) && rawB.gt(0) && !insufficientA && !insufficientB && !busy;

  const submit = async () => {
    if (!canSubmit || !address || !chainId) return;
    setBusy(true);
    try {
      const a = BigInt(rawA.toFixed());
      const b = BigInt(rawB.toFixed());
      const min = (x: bigint) => {
        const m = (x * (10_000n - SLIPPAGE_BPS)) / 10_000n;
        return m > 0n ? m : 1n;
      };
      const data = [
        "MultiESDTNFTTransfer",
        new Address(pool.address).toHex(),
        "02",
        strToHex(pool.tokenA),
        "00",
        bigToHex(a),
        strToHex(pool.tokenB),
        "00",
        bigToHex(b),
        strToHex("addLiquidity"),
        bigToHex(min(a)),
        bigToHex(min(b)),
      ].join("@");
      const gasLimit = await estimateGasLimit(networkApiAddress, { sender: address, receiver: address, data, chainId }, ADD_GAS_FALLBACK);
      const sender = new Address(address);
      await signAndSendTransactions({
        onSignTransactions,
        transactions: [
          new Transaction({
            value: 0n,
            data: new TextEncoder().encode(data),
            receiver: sender,
            sender,
            gasLimit: BigInt(gasLimit),
            gasPrice: BigInt(GAS_PRICE),
            chainID: chainId,
            version: 1,
          }),
        ],
        transactionsDisplayInfo: {
          processingMessage: t("jex_add_processing"),
          successMessage: t("jex_add_success"),
          errorMessage: t("jex_add_error"),
        },
      });
      setAmountA("");
      setAmountB("");
      onSent?.();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const field = (
    ticker: string,
    value: string,
    onChange: (v: string) => void,
    balance: string,
    decimals: number,
    insufficient: boolean,
  ) => (
    <div className="dvx:flex-1 dvx:min-w-[140px]">
      <div className="dvx:flex dvx:justify-between dvx:text-[10px] dvx:font-semibold dvx:text-gray-400 dvx:mb-1">
        <span>{ticker}</span>
        <button
          type="button"
          onClick={() => onChange(new BigNumber(balance).shiftedBy(-decimals).toFixed())}
          className="dvx:bg-transparent dvx:p-0 dvx:text-amber-500 dvx:hover:text-amber-600"
        >
          {t("balance")} : {new BigNumber(balance).shiftedBy(-decimals).decimalPlaces(6, BigNumber.ROUND_DOWN).toFormat()} · MAX
        </button>
      </div>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder="0"
        onChange={(e) => onChange(e.target.value.replace(",", "."))}
        className={`dvx:w-full dvx:rounded-xl dvx:border dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-1.5 dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 dvx:focus:ring-amber-500 ${
          insufficient ? "dvx:border-red-500" : "dvx:border-gray-200 dvx:dark:border-[#444]"
        }`}
      />
    </div>
  );

  return (
    <div className="dvx:rounded-xl dvx:p-3 dvx:mb-3 dvx:bg-[#ffffff] dvx:dark:bg-[#252525]" style={{ boxShadow: "0 0 0 1px rgba(245, 158, 11, 0.35)" }}>
      <div className="dvx:flex dvx:flex-wrap dvx:gap-3">
        {field(tickerA, amountA, onA, balanceA, decimalsA, insufficientA)}
        {field(tickerB, amountB, onB, balanceB, decimalsB, insufficientB)}
      </div>
      <div className="dvx:flex dvx:flex-wrap dvx:items-center dvx:justify-between dvx:gap-2 dvx:mt-3">
        <span className="dvx:text-[11px] dvx:text-gray-500 dvx:dark:text-gray-400">
          {insufficientA || insufficientB
            ? t("jex_add_insufficient")
            : lpOut
              ? t("jex_add_lp_out", { amount: lpOut.shiftedBy(-18).decimalPlaces(6, BigNumber.ROUND_DOWN).toFormat() })
              : t("jex_add_hint")}
        </span>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="dvx:px-4 dvx:py-1.5 dvx:rounded-lg dvx:text-xs dvx:font-bold dvx:bg-amber-500 dvx:text-black dvx:disabled:opacity-50"
        >
          {busy ? "…" : t("jex_add_submit")}
        </button>
      </div>
    </div>
  );
}
