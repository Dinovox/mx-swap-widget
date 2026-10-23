import React from "react";
import axios from "axios";
import BigNumber from "bignumber.js";
import { useTranslation } from "react-i18next";
import { Address, Transaction } from "@multiversx/sdk-core";
import { GAS_PRICE } from "@multiversx/sdk-dapp/out/constants/mvx.constants";
import { useSwapConfig } from "../context/SwapConfigContext";
import { signAndSendTransactions } from "../helpers/signAndSendTransactions";
import { estimateGasLimit } from "../helpers/estimateGas";
import bigToHex from "../helpers/bigToHex";
import strToHex from "../helpers/strToHex";
import { TokenLogo } from "./TokenSelect";

/** One LP position from GET /lp-positions (swapv2 backend). */
export interface LpPosition {
  poolAddress: string;
  dexType: string;
  poolStatus: string;
  paused: boolean | null;
  tokenA: string;
  tokenB: string;
  tokenALogoUrl: string | null;
  tokenBLogoUrl: string | null;
  decimalsA: number;
  decimalsB: number;
  lpToken: string;
  lpBalance: string;
  amountA: string;
  amountB: string;
  valueUsd: string | null;
  live: boolean;
}

// removeLiquidity measured at ~4.6–5.2M gas (simulated on several JEXchange
// pools, paused ones included) — fallback only, each tx is simulated first.
const WITHDRAW_GAS_FALLBACK = 8_000_000;
// Min-out tolerance: tight when the reserves were read on-chain just now,
// wider when the backend fell back on its (possibly stale) DB values.
const SLIPPAGE_LIVE_BPS = 100n; // 1%
const SLIPPAGE_DB_BPS = 500n; // 5%

const ticker = (id: string) => id.split("-")[0];

/** Floor of amount × (1 − slippage), never below 1 raw unit. */
function minOut(amount: string, live: boolean): bigint {
  const a = BigInt(amount);
  const min = (a * (10_000n - (live ? SLIPPAGE_LIVE_BPS : SLIPPAGE_DB_BPS))) / 10_000n;
  return min > 0n ? min : 1n;
}

/**
 * JEXchange is shutting down: lists the JEXchange LP tokens still held in the
 * connected wallet (any pool status — paused/deprecated included, which /pools
 * hides) with a one-click withdraw (removeLiquidity on the JEXchange pair:
 * ESDTTransfer of the LP + minFirst/minSecond, in the pair's token order).
 * Renders nothing when the wallet holds none, or when the backend route is
 * unavailable.
 */
/**
 * JEXchange LP tokens held by the connected wallet (GET /lp-positions) —
 * shared by the withdraw block and the JExchange tab badge (one request).
 * Empty when disconnected or when the backend route is unavailable.
 */
export function useJexLpPositions(): { positions: LpPosition[]; reload: () => void } {
  const { apiUrl, address } = useSwapConfig();
  const [positions, setPositions] = React.useState<LpPosition[]>([]);
  const reload = React.useCallback(() => {
    if (!apiUrl || !address) {
      setPositions([]);
      return;
    }
    axios
      .get<{ positions: LpPosition[] }>(`${apiUrl}/lp-positions`, { params: { address, dexType: "JExchange" } })
      .then((res) => setPositions(res.data.positions ?? []))
      .catch(() => setPositions([]));
  }, [apiUrl, address]);
  React.useEffect(reload, [reload]);
  return { positions, reload };
}

export const EXTERNAL_LP_WITHDRAW_ID = "dvx-jex-withdraw";

export function ExternalLpWithdraw({ positions, reload: load }: { positions: LpPosition[]; reload: () => void }) {
  const { t } = useTranslation("swap");
  const { address, networkApiAddress, chainId, onSignTransactions } = useSwapConfig();
  const [busy, setBusy] = React.useState<string | null>(null);

  if (!address || positions.length === 0) return null;

  const withdraw = async (list: LpPosition[], key: string) => {
    if (!chainId) return;
    setBusy(key);
    try {
      const txs = list.map((p) => ({
        receiver: p.poolAddress,
        data: [
          "ESDTTransfer",
          strToHex(p.lpToken),
          bigToHex(BigInt(p.lpBalance)),
          strToHex("removeLiquidity"),
          bigToHex(minOut(p.amountA, p.live)),
          bigToHex(minOut(p.amountB, p.live)),
        ].join("@"),
      }));
      const gasLimits = await Promise.all(
        txs.map((tx, i) =>
          estimateGasLimit(networkApiAddress, { sender: address!, receiver: tx.receiver, data: tx.data, chainId }, WITHDRAW_GAS_FALLBACK, i),
        ),
      );
      const sender = new Address(address!);
      await signAndSendTransactions({
        onSignTransactions,
        transactions: txs.map(
          (tx, i) =>
            new Transaction({
              value: 0n,
              data: new TextEncoder().encode(tx.data),
              receiver: new Address(tx.receiver),
              sender,
              gasLimit: BigInt(gasLimits[i]),
              gasPrice: BigInt(GAS_PRICE),
              chainID: chainId,
              version: 1,
            }),
        ),
        transactionsDisplayInfo: {
          processingMessage: t("ext_lp_processing"),
          successMessage: t("ext_lp_success"),
          errorMessage: t("ext_lp_error"),
        },
      });
      // Let the withdrawals land, then refresh the list.
      for (const ms of [6_000, 15_000, 30_000]) setTimeout(load, ms);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const fmt = (raw: string, decimals: number) => {
    const v = new BigNumber(raw).shiftedBy(-decimals);
    return v.gte(1) ? v.decimalPlaces(4, BigNumber.ROUND_DOWN).toFormat() : v.precision(4, BigNumber.ROUND_DOWN).toFormat();
  };
  const totalUsd = positions.reduce((s, p) => s + (p.valueUsd ? parseFloat(p.valueUsd) : 0), 0);

  return (
    <div
      id={EXTERNAL_LP_WITHDRAW_ID}
      className="dvx:rounded-2xl dvx:p-4 dvx:bg-[#ffffff] dvx:dark:bg-[#1f1f1f]"
      style={{ border: "2px solid rgba(245, 158, 11, 0.45)" }}
    >
      <div className="dvx:flex dvx:flex-wrap dvx:items-center dvx:justify-between dvx:gap-2">
        <div className="dvx:min-w-0">
          <div className="dvx:text-sm dvx:font-black dvx:text-amber-600 dvx:dark:text-amber-400">{t("ext_lp_title")}</div>
          <div className="dvx:text-xs dvx:text-gray-500 dvx:dark:text-gray-400 dvx:mt-0.5">{t("ext_lp_desc")}</div>
        </div>
        {positions.length > 1 && (
          <button
            onClick={() => withdraw(positions, "all")}
            disabled={busy !== null}
            className="dvx:px-3 dvx:py-1.5 dvx:rounded-lg dvx:text-xs dvx:font-bold dvx:bg-amber-500 dvx:text-black dvx:disabled:opacity-50"
          >
            {t("ext_lp_withdraw_all", { count: positions.length })}
            {totalUsd > 0 ? ` · $${totalUsd.toFixed(2)}` : ""}
          </button>
        )}
      </div>

      <div className="dvx:flex dvx:flex-col dvx:gap-2 dvx:mt-3">
        {positions.map((p) => (
          <div
            key={p.poolAddress}
            className="dvx:flex dvx:flex-wrap dvx:items-center dvx:gap-3 dvx:rounded-xl dvx:px-3 dvx:py-2 dvx:bg-gray-50 dvx:dark:bg-[#2a2a2a]"
          >
            <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
              <TokenLogo url={p.tokenALogoUrl} ticker={ticker(p.tokenA)} />
              <span style={{ marginLeft: -8, borderRadius: 9999, boxShadow: "0 0 0 2px rgba(0,0,0,0.35)", display: "inline-flex" }}>
                <TokenLogo url={p.tokenBLogoUrl} ticker={ticker(p.tokenB)} />
              </span>
            </span>
            <div className="dvx:flex-1 dvx:min-w-[140px]">
              <div className="dvx:text-sm dvx:font-bold dvx:text-gray-900 dvx:dark:text-white">
                {ticker(p.tokenA)} / {ticker(p.tokenB)}
                {(p.paused || p.poolStatus !== "active") && (
                  <span className="dvx:ml-2 dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:text-gray-400">
                    {p.paused || p.poolStatus === "paused" ? t("ext_lp_paused") : t("ext_lp_inactive")}
                  </span>
                )}
              </div>
              <div className="dvx:text-xs dvx:text-gray-500 dvx:dark:text-gray-400">
                ≈ {fmt(p.amountA, p.decimalsA)} {ticker(p.tokenA)} + {fmt(p.amountB, p.decimalsB)} {ticker(p.tokenB)}
                {p.valueUsd ? ` · $${parseFloat(p.valueUsd).toFixed(2)}` : ""}
              </div>
            </div>
            <button
              onClick={() => withdraw([p], p.poolAddress)}
              disabled={busy !== null}
              className="dvx:px-3 dvx:py-1.5 dvx:rounded-lg dvx:text-xs dvx:font-bold dvx:border dvx:border-amber-500 dvx:text-amber-600 dvx:dark:text-amber-400 dvx:disabled:opacity-50"
            >
              {busy === p.poolAddress ? "…" : t("ext_lp_withdraw")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
