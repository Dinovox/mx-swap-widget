import axios from "axios";

// Same approach as the backend (swapv2 arb/wallet.ts estimateTxCost):
// POST /transaction/cost runs the REAL contract logic for this exact call
// (sender, current nonce, arguments) without broadcasting anything, and returns
// the gas it consumes. Unused gas is not refunded on MultiversX ("too much gas
// provided" burns the whole limit), and costs vary per call (e.g.
// claimAllRewards settles every followed stream), so a measured limit beats
// any flat constant.

const SIMULATION_GAS_CEILING = 600_000_000; // protocol max per tx — only the simulation's budget
const MARGIN = 1.15; // +15%: state can move a bit between simulation and execution
const MIN_GAS = 1_000_000;

export interface GasEstimateTx {
  sender: string;
  receiver: string;
  data: string;
  value?: string;
  chainId: string;
}

/**
 * Gas limit for `tx` from a network simulation (+15% margin), or `fallback`
 * when the simulation can't be trusted: network error, revert, or a call that
 * depends on a previous tx of the same batch (simulated against the CURRENT
 * state, it would fail — pass `nonceOffset` > 0 and keep a sane fallback).
 */
export async function estimateGasLimit(
  networkApiAddress: string | undefined,
  tx: GasEstimateTx,
  fallback: number,
  nonceOffset = 0,
): Promise<number> {
  if (!networkApiAddress) return fallback;
  try {
    const { data: account } = await axios.get<{ nonce?: number }>(`/accounts/${tx.sender}`, {
      baseURL: networkApiAddress,
      params: { fields: "nonce" },
    });
    const { data: res } = await axios.post<{ data?: { txGasUnits?: number; returnMessage?: string } }>(
      "/transaction/cost",
      {
        nonce: (account.nonce ?? 0) + nonceOffset,
        value: tx.value ?? "0",
        receiver: tx.receiver,
        sender: tx.sender,
        gasPrice: 1_000_000_000,
        gasLimit: SIMULATION_GAS_CEILING,
        data: btoa(String.fromCharCode(...new TextEncoder().encode(tx.data))),
        chainID: tx.chainId,
        version: 1,
      },
      { baseURL: networkApiAddress, timeout: 10_000 },
    );
    const units = res?.data?.txGasUnits ?? 0;
    if (units > 0 && !res?.data?.returnMessage) return Math.max(MIN_GAS, Math.ceil(units * MARGIN));
  } catch {
    /* network / simulation unavailable → fallback */
  }
  return fallback;
}
