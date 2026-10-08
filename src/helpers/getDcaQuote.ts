import axios from "axios";
import { Address } from "@multiversx/sdk-core";
import strToHex from "./strToHex";
import bigToHex from "./bigToHex";

// Live quote for one DCA execution — the exact number dca-escrow::executeOrder
// compares against min_amount_out / max_amount_out: dca-router::getBestQuote
// (token_in, token_out, amount_per_execution). NOT the aggregator's /quote,
// which can route through pairs the dca-router doesn't whitelist.
//
// Free views via the MultiversX API's POST /query — no ABI needed, the router
// address and WEGLD id are read from the escrow itself (EGLD in is wrapped to
// WEGLD by createOrder before any quote, so the quote must use WEGLD too).

type QueryResponse = { returnData?: (string | null)[]; returnCode?: string };

const b64ToHex = (b64: string | null | undefined) =>
  b64 ? Array.from(atob(b64), (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join("") : "";

const query = async (networkApiAddress: string, scAddress: string, funcName: string, args: string[] = []) => {
  const { data } = await axios.post<QueryResponse>(`${networkApiAddress}/query`, { scAddress, funcName, args });
  if (data.returnCode && data.returnCode !== "ok") throw new Error(`${funcName}: ${data.returnCode}`);
  return data.returnData ?? [];
};

type EscrowRefs = { router: string; wegld: string };
// Per escrow address — both values are owner-set storage that practically never
// changes, no need to re-read them on every quote.
const escrowRefsCache = new Map<string, Promise<EscrowRefs>>();

const getEscrowRefs = (networkApiAddress: string, escrowAddress: string) => {
  const key = `${networkApiAddress}|${escrowAddress}`;
  let refs = escrowRefsCache.get(key);
  if (!refs) {
    refs = Promise.all([
      query(networkApiAddress, escrowAddress, "getDcaRouterAddress"),
      query(networkApiAddress, escrowAddress, "getWegldTokenId"),
    ]).then(([routerData, wegldData]) => ({
      router: Address.newFromHex(b64ToHex(routerData[0])).toBech32(),
      wegld: atob(wegldData[0] ?? ""),
    }));
    refs.catch(() => escrowRefsCache.delete(key)); // don't cache a failure
    escrowRefsCache.set(key, refs);
  }
  return refs;
};

/** Raw token_out amount the dca-router would give right now for `amountInRaw` of `tokenIn`. */
export const getDcaQuote = async (
  networkApiAddress: string,
  escrowAddress: string,
  tokenIn: string,
  tokenOut: string,
  amountInRaw: bigint,
): Promise<bigint> => {
  const { router, wegld } = await getEscrowRefs(networkApiAddress, escrowAddress);
  const [out] = await query(networkApiAddress, router, "getBestQuote", [
    strToHex(tokenIn === "EGLD" ? wegld : tokenIn),
    strToHex(tokenOut === "EGLD" ? wegld : tokenOut),
    bigToHex(amountInRaw),
  ]);
  const hex = b64ToHex(out);
  return hex ? BigInt(`0x${hex}`) : 0n;
};

export interface DcaMinOrderConfig {
  /** null = mechanism disabled (owner never called setMinOrderReference). */
  minOrderReferenceToken: string | null;
  minOrderAmount: bigint;
  /** 0 = self-funded gas reserve unavailable — a below-minimum order is hard-rejected, no way around it. */
  gasFeePerExecution: bigint;
}

// Same rationale as escrowRefsCache above: owner-set storage that changes
// rarely (an admin action), read directly from the escrow — no backend
// dependency for a decision that gates whether createOrder will revert.
const minOrderConfigCache = new Map<string, Promise<DcaMinOrderConfig>>();

/** dca-escrow's current minOrderReference / gasFeePerExecution settings (cf. dca-escrow/src/lib.rs V5). */
export const getDcaMinOrderConfig = (
  networkApiAddress: string,
  escrowAddress: string,
): Promise<DcaMinOrderConfig> => {
  const key = `${networkApiAddress}|${escrowAddress}`;
  let cfg = minOrderConfigCache.get(key);
  if (!cfg) {
    cfg = Promise.all([
      query(networkApiAddress, escrowAddress, "getMinOrderReferenceToken"),
      query(networkApiAddress, escrowAddress, "getMinOrderAmount"),
      query(networkApiAddress, escrowAddress, "getGasFeePerExecution"),
    ]).then(([refTokenData, minAmountData, gasFeeData]) => {
      const tokenStr = atob(refTokenData[0] ?? "");
      const minAmountHex = b64ToHex(minAmountData[0]);
      const gasFeeHex = b64ToHex(gasFeeData[0]);
      return {
        minOrderReferenceToken: tokenStr || null,
        minOrderAmount: minAmountHex ? BigInt(`0x${minAmountHex}`) : 0n,
        gasFeePerExecution: gasFeeHex ? BigInt(`0x${gasFeeHex}`) : 0n,
      };
    });
    cfg.catch(() => minOrderConfigCache.delete(key));
    minOrderConfigCache.set(key, cfg);
  }
  return cfg;
};
