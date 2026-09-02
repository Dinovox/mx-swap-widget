import { Abi, Address, ApiNetworkProvider, SmartContractController } from "@multiversx/sdk-core";
import pairAbiJson from "../abis/pair.abi.json";

// pair v2 ABI (swapv2/pair) — adds addLiquiditySingle / quoteAddLiquiditySingle.
const pairAbi = Abi.create(pairAbiJson);

/**
 * Calls the pair contract's `quoteAddLiquiditySingle` view — the single-side deposit
 * split (virtual swap sized to land on the pool ratio) solves a quadratic that the
 * contract explicitly asks callers not to reimplement client-side, so this always goes
 * on-chain rather than approximating the amount locally.
 *
 * Throws if the query fails (e.g. empty pool, degenerate amount) — callers should
 * catch and surface a "quote unavailable" state.
 */
export async function quoteAddLiquiditySingle(params: {
  networkApiAddress: string;
  chainId: string;
  poolAddress: string;
  tokenIn: string;
  amountIn: bigint;
}): Promise<bigint> {
  const { networkApiAddress, chainId, poolAddress, tokenIn, amountIn } = params;
  const networkProvider = new ApiNetworkProvider(networkApiAddress);
  const controller = new SmartContractController({
    chainID: chainId,
    networkProvider,
    abi: pairAbi,
  });
  const [lpToMint] = await controller.query({
    contract: new Address(poolAddress),
    function: "quoteAddLiquiditySingle",
    arguments: [tokenIn, amountIn],
  });
  return BigInt(lpToMint.toString());
}
