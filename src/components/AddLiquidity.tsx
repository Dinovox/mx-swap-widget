import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { useGoTo } from "../context/SwapViewContext";
import { useWidgetSearchParams } from "../hooks/useWidgetSearchParams";
import { ArrowLeft, ArrowRight, Plus, Shuffle, Info, ChevronDown } from "lucide-react";
import useLoadTranslations from "../hooks/useLoadTranslations";
import { Address, Transaction } from "@multiversx/sdk-core";
import { GAS_PRICE } from "@multiversx/sdk-dapp/out/constants/mvx.constants";
import { signAndSendTransactions } from "../helpers/signAndSendTransactions";
import { useGetUserESDT } from "../hooks/useGetUserEsdt";
import { Card } from "../ui/Card";
import { TokenSelect, TokenLogo } from "../ui/TokenSelect";
import bigToHex from "../helpers/bigToHex";
import strToHex from "../helpers/strToHex";
import { quoteAddLiquiditySingle } from "../helpers/quoteAddLiquiditySingle";
import { brandedTokensVoxEgldFirst } from "../helpers/brandedTokens";
import { useSwapConfig } from "../context/SwapConfigContext";
import BigNumber from "bignumber.js";
import type { DexToken, PoolInfo, LiquidityPool } from "../types";

const SINGLE_SLIPPAGE_PRESETS = [0.005, 0.01, 0.02]; // 0.5 %, 1 %, 2 %
const VOXEGLD_IDENTIFIER = "VOXEGLD-5872e5";

/** One entry from the pool detail endpoint's `recentSwaps` — always against tokenA/tokenB. */
interface RecentSwap {
  id: string;
  txHash: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  timestamp: string;
}

/** Short relative age ("à l'instant", "5min", "2h", "3j") — no grammatical plural needed. */
function formatRelativeTime(iso: string, t: (key: string, opts?: any) => string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return t("time_ago_now");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("time_ago_minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("time_ago_hours", { count: hours });
  return t("time_ago_days", { count: Math.floor(hours / 24) });
}

function formatUsd(priceUsd: string, amount: number): string | null {
  if (!amount || !priceUsd) return null;
  const value = parseFloat(priceUsd) * amount;
  if (!value) return null;
  if (value < 0.01) return "<$0.01";
  if (value < 1000) return `$${value.toFixed(2)}`;
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * Thousands separators, trailing zeros trimmed. Amounts ≥ 0.1 show 2 decimals;
 * below that the decimal count grows just enough to keep 2 significant digits
 * (e.g. 0.0034 rather than 0.00), capped at `maxDecimals`.
 */
function formatTokenAmount(value: BigNumber, maxDecimals = 6): string {
  if (value.isZero()) return "0";
  let dp = 2;
  if (value.lt(0.1)) {
    const magnitude = Math.floor(Math.log10(value.toNumber()));
    dp = Math.min(-magnitude - 1 + 2, maxDecimals);
  }
  const fixed = value.toFixed(dp, BigNumber.ROUND_DOWN);
  return Number(fixed).toLocaleString("en-US", { maximumFractionDigits: dp });
}

/** Share of the pool (post-deposit LP supply) a `lpToMint` amount represents. */
function formatPoolShare(share: BigNumber): string {
  if (share.isZero()) return "0%";
  if (share.lt(0.01)) return "<0.01%";
  return `${share.toFixed(2)}%`;
}

function intSqrt(n: bigint): bigint {
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}

export const AddLiquidity = () => {
  const {
    apiUrl,
    onConnect,
    address,
    networkApiAddress,
    chainId,
    onSignTransactions,
    explorerAddress,
  } = useSwapConfig();
  const goTo = useGoTo();
  const { t } = useTranslation("swap");
  useLoadTranslations("swap");
  const [searchParams, setSearchParams] = useWidgetSearchParams();

  const [tokens, setTokens] = useState<DexToken[]>([]);
  // `hubTokens` stays the narrower "is this actually a hub token" signal used
  // below for deep-link ordering; tokenA's own picker (tokenAOptions, defined
  // once walletTokens is available further down) is a different, wider list.
  const [hubTokens, setHubTokens] = useState<DexToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [tokenA, setTokenA] = useState<DexToken | null>(null);
  const [tokenB, setTokenB] = useState<DexToken | null>(null);
  // True once tokenA/tokenB have been resolved from the initial URL (or we've
  // determined there was nothing to resolve). Gates the tokenA/tokenB → URL
  // sync effect further below — without it, that effect would fire on the
  // very first render (tokenA/tokenB both still null before the token list
  // has loaded) and wipe a `?tokenA=...` deep link from the address bar
  // before it ever got a chance to resolve.
  const urlHydrated = useRef(false);

  // Thin wrappers kept for readability at call sites — the actual URL sync
  // (for these and any other change to tokenA/tokenB, e.g. the hub-first
  // reorder below) happens in one place, the dedicated effect further down.
  const selectTokenA = (t: DexToken | null) => setTokenA(t);
  const selectTokenB = (t: DexToken | null) => setTokenB(t);

  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  // True while fetching a market quote to suggest the other side's amount on a
  // first deposit (empty pool) — see the effect below.
  const [initialRatioLoading, setInitialRatioLoading] = useState(false);
  const lastEdited = useRef<"A" | "B">("A");
  const [pool, setPool] = useState<LiquidityPool | null>(null);
  const [poolLoading, setPoolLoading] = useState(false);
  const [lpTotalMinted, setLpTotalMinted] = useState<string | null>(null);
  const [poolApr, setPoolApr] = useState<{ aprPct: string; windowDays: number } | null>(null);
  const [recentSwaps, setRecentSwaps] = useState<RecentSwap[]>([]);
  const [recentSwapsExpanded, setRecentSwapsExpanded] = useState(false);
  const [lpPreview, setLpPreview] = useState<bigint | null>(null);
  const [refundA, setRefundA] = useState(0n);
  const [refundB, setRefundB] = useState(0n);
  const [lpTokenSet, setLpTokenSet] = useState<Set<string>>(new Set());

  // Single-side deposit (addLiquiditySingle, pair v2) — deposit only tokenA or
  // tokenB, split internally by the contract via a virtual swap onto the pool ratio.
  // Mirrored to the `mode` URL param (like tokenA/tokenB) so hosts can deep-link
  // users straight into single-token mode, e.g. `?tokenA=X&tokenB=Y&mode=single`.
  const [mode, setModeState] = useState<"double" | "single">(() =>
    searchParams.get("mode") === "single" ? "single" : "double",
  );
  const setMode = (m: "double" | "single") => {
    setModeState(m);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        m === "single" ? p.set("mode", "single") : p.delete("mode");
        return p;
      },
      { replace: true },
    );
  };
  const [singleSlippage, setSingleSlippage] = useState(0.01);
  const [singleLpPreview, setSingleLpPreview] = useState<bigint | null>(null);
  const [singleQuoteLoading, setSingleQuoteLoading] = useState(false);
  const [singleQuoteError, setSingleQuoteError] = useState(false);
  // Read inside the pool-fetch effect below (async, runs after the fetch settles)
  // instead of the `mode` state directly — avoids re-running the fetch on every
  // mode toggle while still seeing the latest value once the response comes back.
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const allWalletTokensRaw = useGetUserESDT(undefined, {
    enabled: !!address,
    address,
    networkApiAddress,
  });
  const [walletTokens, setWalletTokens] = useState<DexToken[]>([]);

  const tokenBChoices = React.useMemo(() => {
    const base = walletTokens.length > 0 ? walletTokens : [];
    if (tokenB && !base.some((t) => t.identifier === tokenB.identifier))
      return [tokenB, ...base];
    return base;
  }, [walletTokens, tokenB]);

  useEffect(() => {
    if (!allWalletTokensRaw || allWalletTokensRaw.length === 0) {
      setWalletTokens([]);
      return;
    }
    const mapped: DexToken[] = allWalletTokensRaw
      .filter((t: any) => !lpTokenSet.has(t.identifier))
      .map((t: any) => {
        const dinoToken = tokens.find((dt) => dt.identifier === t.identifier);
        const priceUsd =
          dinoToken?.priceUsd ?? (t.price != null ? String(t.price) : null);
        return {
          identifier: t.identifier,
          ticker: t.ticker || t.identifier.split("-")[0],
          poolCount: 0,
          decimals: t.decimals ?? 18,
          logoUrl: t.assets?.svgUrl ?? t.assets?.pngUrl ?? null,
          priceUsd,
        };
      });
    setWalletTokens(mapped);
  }, [allWalletTokensRaw, lpTokenSet, tokens]);

  // tokenA's actual candidate list: VOXEGLD regardless of balance, every
  // other branded token only if the connected wallet actually holds it.
  const tokenAOptions = useMemo(() => {
    const heldIds = new Set(walletTokens.map((t) => t.identifier));
    return brandedTokensVoxEgldFirst(tokens).filter(
      (t) => t.identifier === VOXEGLD_IDENTIFIER || heldIds.has(t.identifier),
    );
  }, [tokens, walletTokens]);

  const balancesA = useGetUserESDT(tokenA?.identifier ?? undefined, {
    enabled: !!tokenA && !!address,
    address,
    networkApiAddress,
  });
  const balancesB = useGetUserESDT(tokenB?.identifier ?? undefined, {
    enabled: !!tokenB && !!address,
    address,
    networkApiAddress,
  });
  const balanceRawA = balancesA?.[0]?.balance ?? "0";
  const balanceRawB = balancesB?.[0]?.balance ?? "0";
  const balanceDisplayA =
    tokenA && balanceRawA
      ? new BigNumber(balanceRawA)
          .shiftedBy(-tokenA.decimals)
          .toFixed(6, BigNumber.ROUND_DOWN)
      : "0";
  const balanceDisplayB =
    tokenB && balanceRawB
      ? new BigNumber(balanceRawB)
          .shiftedBy(-tokenB.decimals)
          .toFixed(6, BigNumber.ROUND_DOWN)
      : "0";

  useEffect(() => {
    if (!apiUrl) return;
    setTokensLoading(true);
    const fetchTokens = async () => {
      try {
        const [tokensRes, hubTokensRes, poolsRes] = await Promise.all([
          axios.get(`${apiUrl}/tokens`),
          axios.get(`${apiUrl}/tokens/hub`).catch(() => ({ data: [] })),
          axios.get(`${apiUrl}/pools`).catch(() => ({ data: { pools: [] } })),
        ]);
        const allLpTokens: string[] = (poolsRes.data.pools || [])
          .map((p: any) => p.lpToken)
          .filter(Boolean);
        setLpTokenSet(new Set(allLpTokens));
        const raw = tokensRes.data.tokens || [];
        const hubItems = hubTokensRes.data?.hubTokens || [];
        const hubList: string[] = hubItems.map((h: any) => h.identifier);
        const combinedRaw = [...raw];
        for (const ht of hubItems)
          if (!combinedRaw.find((t: any) => t.identifier === ht.identifier))
            combinedRaw.push({ ...ht, poolCount: 0 });
        const validTokens: DexToken[] = combinedRaw.map((t: any) => ({
          identifier: t.identifier,
          ticker: t.ticker || t.identifier.split("-")[0],
          poolCount: t.poolCount ?? 0,
          decimals: t.decimals ?? 18,
          logoUrl: t.logoUrl ?? null,
          priceUsd: t.priceUsd ?? null,
        }));
        setTokens(validTokens);
        setHubTokens(validTokens.filter((t) => hubList.includes(t.identifier)));
      } catch (err) {
        console.error(err);
      } finally {
        setTokensLoading(false);
      }
    };
    fetchTokens();
  }, [apiUrl]); // eslint-disable-line

  useEffect(() => {
    if (tokens.length === 0) return;
    if (!tokenA && !tokenB) {
      const qA = searchParams.get("tokenA");
      const qB = searchParams.get("tokenB");
      let foundA = qA ? tokens.find((t) => t.identifier === qA) ?? null : null;
      let foundB = qB ? tokens.find((t) => t.identifier === qB) ?? null : null;
      // Links built from an existing pool (Liquidity/Pools "Ajouter") carry the
      // pool's on-chain tokenA/tokenB — sorted alphanumerically at pool creation
      // to avoid mirrored pairs in the factory, not by which side is the
      // hub/main token. Put the hub token first so it lands in this form's
      // first slot, matching its own convention (that selector only offers hub
      // tokens when nothing is preset).
      if (
        foundA &&
        foundB &&
        hubTokens.some((t) => t.identifier === foundB!.identifier) &&
        !hubTokens.some((t) => t.identifier === foundA!.identifier)
      ) {
        [foundA, foundB] = [foundB, foundA];
      }
      if (foundA) setTokenA(foundA);
      if (foundB) setTokenB(foundB);
    }
    // Marked once tokens are available, regardless of whether there was
    // anything to resolve — this is our one shot at reading the initial URL;
    // from here on the sync effect below takes over in the other direction.
    urlHydrated.current = true;
  }, [tokens]); // eslint-disable-line

  // Keeps the URL aligned with the actual selection — covers manual picks
  // (selectTokenA/B) as well as the hub-first reorder above, so the address
  // bar never drifts from what's shown on screen.
  useEffect(() => {
    if (!urlHydrated.current) return;
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        tokenA ? p.set("tokenA", tokenA.identifier) : p.delete("tokenA");
        tokenB ? p.set("tokenB", tokenB.identifier) : p.delete("tokenB");
        return p;
      },
      { replace: true },
    );
  }, [tokenA, tokenB]); // eslint-disable-line

  // addLiquiditySingle (pair v2) needs an existing, non-empty pool to derive a ratio
  // to split against — fall back to double-sided mode whenever that's not the case.
  // Decided right here, synchronously with the fetch result, rather than in a
  // separate effect watching `poolHasLiquidity`: that state only updates on the
  // *next* render, so on the very render where tokenA/tokenB first resolve (e.g.
  // from a `?mode=single` deep link / page refresh) it would still read the old
  // "no pool yet" values and bounce mode back to double before the fetch even ran.
  const revertModeIfNoLiquidity = (found: PoolInfo | null) => {
    const hasLiquidity = !!(
      found &&
      new BigNumber(found.reserveA ?? "0").gt(0) &&
      new BigNumber(found.reserveB ?? "0").gt(0)
    );
    if (modeRef.current === "single" && !hasLiquidity) setMode("double");
  };

  useEffect(() => {
    if (!tokenA || !tokenB) {
      setPool(null);
      setLpTotalMinted(null);
      setPoolApr(null);
      setRecentSwaps([]);
      // Deliberately not reverting mode here: this branch also runs on first
      // mount before tokenA/tokenB have been resolved from the URL (they're
      // set asynchronously once the token list loads), and there's no way to
      // tell that apart from a genuine "no token selected" from here. Only
      // revert once a pool lookup has actually been attempted, below.
      return;
    }
    let cancelled = false;
    setPoolLoading(true);
    setRecentSwapsExpanded(false);

    const fetchPool = async () => {
      try {
        // /pools (the full list) only includes pools that already have
        // liquidity — a freshly created, still-empty pool never appears
        // there. /pools/pair looks up this exact pair directly and returns
        // it regardless of liquidity state (same endpoint CreatePool uses
        // to confirm pair creation), so it's the correct source of truth
        // here too.
        const res = await axios.get(`${apiUrl}/pools/pair`, {
          params: { tokenA: tokenA.identifier, tokenB: tokenB.identifier },
        });
        if (cancelled) return;
        const found: PoolInfo | null = res.data?.address ? res.data : null;
        setPool((found as LiquidityPool) || null);
        revertModeIfNoLiquidity(found);
        if (found?.address) {
          try {
            // Pool *detail* endpoint rather than the /pools/pair snapshot
            // above — a single-pool lookup stays fresher. Refreshing
            // reserveA/reserveB/lpSupply from this one response (instead of
            // mixing the /pools/pair snapshot's reserves with a separately
            // on-chain-queried live supply, as before) keeps them from the
            // same moment: a swap/arbitrage that just rebalanced the pool
            // was otherwise leaving the LP-received/refund estimates below
            // quietly wrong. Also surfaces APR/recent swaps for the panel.
            const detailRes = await axios.get(`${apiUrl}/pools/${found.address}`);
            if (!cancelled) {
              const d = detailRes.data;
              if (d?.reserveA != null && d?.reserveB != null && d?.lpSupply != null) {
                const freshened: LiquidityPool = {
                  ...(found as LiquidityPool),
                  reserveA: d.reserveA,
                  reserveB: d.reserveB,
                  lpSupply: d.lpSupply,
                  lpTokenPriceUsd:
                    d.lpTokenPriceUsd ?? (found as LiquidityPool).lpTokenPriceUsd,
                };
                setPool(freshened);
                setLpTotalMinted(d.lpSupply);
                revertModeIfNoLiquidity(freshened);
              } else {
                setLpTotalMinted(null);
              }
              setPoolApr(d?.apr ?? null);
              setRecentSwaps(d?.recentSwaps ?? []);
            }
          } catch {
            if (!cancelled) {
              setLpTotalMinted(null);
              setPoolApr(null);
              setRecentSwaps([]);
            }
          }
        } else if (!cancelled) {
          setLpTotalMinted(null);
          setPoolApr(null);
          setRecentSwaps([]);
        }
      } catch (err: any) {
        if (err?.response?.status !== 404) console.error(err);
        if (!cancelled) {
          setPool(null);
          setLpTotalMinted(null);
          setPoolApr(null);
          setRecentSwaps([]);
          revertModeIfNoLiquidity(null);
        }
      } finally {
        if (!cancelled) setPoolLoading(false);
      }
    };

    fetchPool();
    return () => {
      cancelled = true;
    };
  }, [tokenA, tokenB]); // eslint-disable-line

  const poolHasLiquidity = !!(
    pool &&
    new BigNumber(pool.reserveA).gt(0) &&
    new BigNumber(pool.reserveB).gt(0)
  );

  // Pool reserves realigned to the currently selected tokenA/tokenB order — the
  // contract's internal token_a/token_b pairing doesn't necessarily match it.
  const poolMatchesTokenA = !!(
    pool &&
    tokenA &&
    pool.tokenA === tokenA.identifier
  );
  const reserveForTokenA = pool
    ? poolMatchesTokenA
      ? pool.reserveA
      : pool.reserveB
    : null;
  const reserveForTokenB = pool
    ? poolMatchesTokenA
      ? pool.reserveB
      : pool.reserveA
    : null;
  const reserveABn =
    reserveForTokenA && tokenA
      ? new BigNumber(reserveForTokenA).shiftedBy(-tokenA.decimals)
      : null;
  const reserveBBn =
    reserveForTokenB && tokenB
      ? new BigNumber(reserveForTokenB).shiftedBy(-tokenB.decimals)
      : null;
  const reserveADisplay = reserveABn ? formatTokenAmount(reserveABn) : null;
  const reserveBDisplay = reserveBBn ? formatTokenAmount(reserveBBn) : null;
  const reserveAUsd =
    reserveABn && tokenA?.priceUsd
      ? formatUsd(tokenA.priceUsd, reserveABn.toNumber())
      : null;
  const reserveBUsd =
    reserveBBn && tokenB?.priceUsd
      ? formatUsd(tokenB.priceUsd, reserveBBn.toNumber())
      : null;

  // Total LP supply right now — prefer the live on-chain figure (lpTotalMinted),
  // fall back to the API snapshot on the pool. Used to estimate the share of the
  // pool this deposit is about to represent.
  const currentLpSupply =
    lpTotalMinted != null
      ? new BigNumber(lpTotalMinted)
      : new BigNumber(pool?.lpSupply ?? "0");

  useEffect(() => {
    setAmountA("");
    setAmountB("");
  }, [mode]);

  const handleAmountA = (val: string) => {
    setAmountA(val);
    lastEdited.current = "A";
    if (mode === "single") {
      setAmountB("");
      return;
    }
    if (!pool || !tokenA || !tokenB || !val) return;
    const isA = pool.tokenA === tokenA.identifier;
    const resA = new BigNumber(isA ? pool.reserveA : pool.reserveB);
    const resB = new BigNumber(isA ? pool.reserveB : pool.reserveA);
    if (resA.isZero() || resB.isZero()) return;
    setAmountB(
      new BigNumber(val)
        .shiftedBy(tokenA.decimals)
        .multipliedBy(resB)
        .dividedBy(resA)
        .shiftedBy(-tokenB.decimals)
        .toFixed(6, BigNumber.ROUND_UP),
    );
  };

  const handleAmountB = (val: string) => {
    setAmountB(val);
    lastEdited.current = "B";
    if (mode === "single") {
      setAmountA("");
      return;
    }
    if (!pool || !tokenA || !tokenB || !val) return;
    const isA = pool.tokenA === tokenA.identifier;
    const resA = new BigNumber(isA ? pool.reserveA : pool.reserveB);
    const resB = new BigNumber(isA ? pool.reserveB : pool.reserveA);
    if (resA.isZero() || resB.isZero()) return;
    setAmountA(
      new BigNumber(val)
        .shiftedBy(tokenB.decimals)
        .multipliedBy(resA)
        .dividedBy(resB)
        .shiftedBy(-tokenA.decimals)
        .toFixed(6, BigNumber.ROUND_UP),
    );
  };

  // First deposit into this pair (pool empty, or not created yet) — no on-chain
  // reserve ratio to auto-balance against, so handleAmountA/B above leave the
  // other field untouched. Suggest a starting amount from the aggregator's own
  // market quote instead, purely as a convenience: only fills the *other* field
  // once, and only while it's still empty — never overwrites an amount the user
  // (or a prior quote) already set, and never blocks the form on failure (no
  // route just means we can't suggest one, not a form error).
  useEffect(() => {
    if (mode !== "double" || poolHasLiquidity || !tokenA || !tokenB) return;
    const side = lastEdited.current;
    const sourceAmount = side === "A" ? amountA : amountB;
    const otherAmount = side === "A" ? amountB : amountA;
    if (!sourceAmount || Number(sourceAmount) <= 0) return;
    if (otherAmount && Number(otherAmount) > 0) return;

    const sourceToken = side === "A" ? tokenA : tokenB;
    const targetToken = side === "A" ? tokenB : tokenA;
    const setTarget = side === "A" ? setAmountB : setAmountA;

    let cancelled = false;
    setInitialRatioLoading(true);
    const handle = setTimeout(async () => {
      try {
        const amountInRaw = new BigNumber(sourceAmount)
          .shiftedBy(sourceToken.decimals)
          .toFixed(0, BigNumber.ROUND_DOWN);
        const { data } = await axios.get(`${apiUrl}/quote`, {
          params: {
            tokenIn: sourceToken.identifier,
            tokenOut: targetToken.identifier,
            amountIn: amountInRaw,
            slippageBps: 100,
          },
        });
        if (cancelled) return;
        setTarget(
          new BigNumber(data.amountOut)
            .shiftedBy(-targetToken.decimals)
            .toFixed(6, BigNumber.ROUND_DOWN),
        );
      } catch {
        // No route / no liquidity elsewhere — nothing to suggest, silently.
      } finally {
        if (!cancelled) setInitialRatioLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      setInitialRatioLoading(false);
      clearTimeout(handle);
    };
  }, [mode, poolHasLiquidity, tokenA, tokenB, amountA, amountB, apiUrl]);

  useEffect(() => {
    if (
      mode !== "double" ||
      !tokenA ||
      !tokenB ||
      !amountA ||
      !amountB ||
      Number(amountA) <= 0 ||
      Number(amountB) <= 0
    ) {
      setLpPreview(null);
      setRefundA(0n);
      setRefundB(0n);
      return;
    }
    const aAmt = BigInt(
      new BigNumber(amountA).shiftedBy(tokenA.decimals).toFixed(0),
    );
    const bAmt = BigInt(
      new BigNumber(amountB).shiftedBy(tokenB.decimals).toFixed(0),
    );
    if (!poolHasLiquidity) {
      setLpPreview(intSqrt(aAmt * bAmt));
      setRefundA(0n);
      setRefundB(0n);
      return;
    }
    const resAbn = new BigNumber(pool!.reserveA);
    const resBbn = new BigNumber(pool!.reserveB);
    const isA = pool!.tokenA === tokenA.identifier;
    const pAmtA = isA ? aAmt : bAmt;
    const pAmtB = isA ? bAmt : aAmt;
    const resA = BigInt(resAbn.toFixed(0));
    const resB = BigInt(resBbn.toFixed(0));
    const lpSupply = BigInt(
      new BigNumber(lpTotalMinted ?? "0").isZero()
        ? "1"
        : new BigNumber(lpTotalMinted!).toFixed(0),
    );
    const lpFromA = resA > 0n ? (pAmtA * lpSupply) / resA : 0n;
    const lpFromB = resB > 0n ? (pAmtB * lpSupply) / resB : 0n;
    if (lpFromA <= lpFromB) {
      setLpPreview(lpFromA);
      const uB = resA > 0n ? (pAmtA * resB) / resA : 0n;
      setRefundA(0n);
      setRefundB(isA ? pAmtB - uB : pAmtA - uB);
    } else {
      setLpPreview(lpFromB);
      const uA = resB > 0n ? (pAmtB * resA) / resB : 0n;
      setRefundA(isA ? pAmtA - uA : pAmtB - uA);
      setRefundB(0n);
    }
  }, [amountA, amountB, pool, tokenA, tokenB, lpTotalMinted]);

  const handleTx = async () => {
    if (!pool || !tokenA || !tokenB || !address || !amountA || !amountB) return;
    try {
      const aAmt = BigInt(
        new BigNumber(amountA).shiftedBy(tokenA.decimals).toFixed(0),
      );
      const bAmt = BigInt(
        new BigNumber(amountB).shiftedBy(tokenB.decimals).toFixed(0),
      );
      const senderAddr = new Address(address);
      const txDataParts = [
        "MultiESDTNFTTransfer",
        new Address(pool.address).toHex(),
        "02",
        strToHex(tokenA.identifier),
        "00",
        bigToHex(aAmt),
        strToHex(tokenB.identifier),
        "00",
        bigToHex(bAmt),
        strToHex("addLiquidity"),
        bigToHex(0n),
        bigToHex(0n),
      ];
      const transaction = new Transaction({
        value: 0n,
        data: new TextEncoder().encode(txDataParts.join("@")),
        receiver: senderAddr,
        sender: senderAddr,
        gasLimit: 15_000_000n,
        gasPrice: BigInt(GAS_PRICE),
        chainID: chainId!,
        version: 1,
      });
      await signAndSendTransactions({
        onSignTransactions,
        transactions: [transaction],
        transactionsDisplayInfo: {
          processingMessage: t("add_processing"),
          errorMessage: t("add_error"),
          successMessage: t("add_success"),
        },
      });
      setAmountA("");
      setAmountB("");
    } catch (err) {
      console.error(err);
    }
  };

  // Which side is being deposited in single mode — whichever field was last typed
  // into (the other is cleared by handleAmountA/B above).
  const singleSide = lastEdited.current;
  const activeSingleToken = singleSide === "A" ? tokenA : tokenB;
  const singleAmount = singleSide === "A" ? amountA : amountB;
  const activeSingleBalanceRaw = singleSide === "A" ? balanceRawA : balanceRawB;

  useEffect(() => {
    if (
      mode !== "single" ||
      !pool ||
      !poolHasLiquidity ||
      !activeSingleToken ||
      !singleAmount ||
      Number(singleAmount) <= 0 ||
      !networkApiAddress ||
      !chainId
    ) {
      setSingleLpPreview(null);
      setSingleQuoteError(false);
      setSingleQuoteLoading(false);
      return;
    }
    let amountInRaw: bigint;
    try {
      amountInRaw = BigInt(
        new BigNumber(singleAmount)
          .shiftedBy(activeSingleToken.decimals)
          .toFixed(0),
      );
    } catch {
      return;
    }
    if (amountInRaw <= 0n) {
      setSingleLpPreview(null);
      return;
    }
    let cancelled = false;
    setSingleQuoteLoading(true);
    setSingleQuoteError(false);
    const handle = setTimeout(async () => {
      try {
        const lp = await quoteAddLiquiditySingle({
          networkApiAddress,
          chainId,
          poolAddress: pool.address,
          tokenIn: activeSingleToken.identifier,
          amountIn: amountInRaw,
        });
        if (!cancelled) setSingleLpPreview(lp);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setSingleLpPreview(null);
          setSingleQuoteError(true);
        }
      } finally {
        if (!cancelled) setSingleQuoteLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [
    mode,
    pool,
    poolHasLiquidity,
    activeSingleToken,
    singleAmount,
    networkApiAddress,
    chainId,
  ]);

  const singleMinLp =
    singleLpPreview !== null
      ? (singleLpPreview * BigInt(Math.round((1 - singleSlippage) * 10000))) /
        10000n
      : null;

  const handleSingleTx = async () => {
    if (
      !pool ||
      !address ||
      !activeSingleToken ||
      !singleAmount ||
      singleMinLp === null
    )
      return;
    try {
      const amountInRaw = BigInt(
        new BigNumber(singleAmount)
          .shiftedBy(activeSingleToken.decimals)
          .toFixed(0),
      );
      const senderAddr = new Address(address);
      const txDataParts = [
        "ESDTTransfer",
        strToHex(activeSingleToken.identifier),
        bigToHex(amountInRaw),
        strToHex("addLiquiditySingle"),
        bigToHex(singleMinLp),
      ];
      const transaction = new Transaction({
        value: 0n,
        data: new TextEncoder().encode(txDataParts.join("@")),
        receiver: new Address(pool.address),
        sender: senderAddr,
        // Heavier than the two-sided add: the contract runs a virtual swap
        // (fee split + AMM math) before folding the result into a normal deposit.
        gasLimit: 11_000_000n,
        gasPrice: BigInt(GAS_PRICE),
        chainID: chainId!,
        version: 1,
      });
      await signAndSendTransactions({
        onSignTransactions,
        transactions: [transaction],
        transactionsDisplayInfo: {
          processingMessage: t("add_processing"),
          errorMessage: t("add_error"),
          successMessage: t("add_success"),
        },
      });
      setAmountA("");
      setAmountB("");
    } catch (err) {
      console.error(err);
    }
  };

  const aErr = !!(
    amountA &&
    new BigNumber(amountA)
      .shiftedBy(tokenA?.decimals ?? 18)
      .isGreaterThan(balanceRawA)
  );
  const bErr = !!(
    amountB &&
    new BigNumber(amountB)
      .shiftedBy(tokenB?.decimals ?? 18)
      .isGreaterThan(balanceRawB)
  );
  const singleErr = !!(
    singleAmount &&
    activeSingleToken &&
    new BigNumber(singleAmount)
      .shiftedBy(activeSingleToken.decimals)
      .isGreaterThan(activeSingleBalanceRaw)
  );

  const amountAUsd =
    tokenA?.priceUsd && Number(amountA) > 0
      ? formatUsd(tokenA.priceUsd, Number(amountA))
      : null;
  const amountBUsd =
    tokenB?.priceUsd && Number(amountB) > 0
      ? formatUsd(tokenB.priceUsd, Number(amountB))
      : null;

  // Share of the pool this deposit is about to represent — lpToMint over the
  // post-deposit total supply (first deposit into an empty pool is always 100%).
  const poolShareAfter = (lpToMint: bigint): BigNumber | null => {
    const supplyAfter = currentLpSupply.plus(lpToMint.toString());
    if (supplyAfter.isZero()) return null;
    return new BigNumber(lpToMint.toString())
      .dividedBy(supplyAfter)
      .multipliedBy(100);
  };
  const doublePoolShare = lpPreview !== null ? poolShareAfter(lpPreview) : null;
  const singlePoolShare =
    singleLpPreview !== null ? poolShareAfter(singleLpPreview) : null;

  return (
    <div className="dvx:flex dvx:flex-col dvx:w-full dvx:gap-6">
      <Card
        className="dvx:border-2 dvx:border-cyan-500/20"
        title={
          <div className="dvx:flex dvx:flex-col dvx:xs:flex-row dvx:items-start dvx:xs:items-center dvx:gap-3 dvx:w-full">
            <div className="dvx:flex dvx:items-center dvx:gap-3">
              <button
                onClick={() => goTo("liquidity")}
                className="dvx:p-1.5 dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:rounded-lg dvx:hover:bg-gray-200 dvx:dark:hover:bg-[#2a2a2a] dvx:transition dvx:flex-shrink-0"
              >
                <ArrowLeft className="dvx:w-4 dvx:h-4 dvx:text-gray-600 dvx:dark:text-gray-300" />
              </button>
              <span className="dvx:text-xl">➕</span>
              <span className="dvx:text-lg dvx:font-black dvx:tracking-tight dvx:whitespace-nowrap">
                {t("add_card_title")}
              </span>
            </div>
          </div>
        }
        description={t("add_card_desc")}
      >
        <div className="dvx:space-y-2 dvx:mt-4">
          <div className="dvx:flex dvx:gap-1 dvx:p-1 dvx:bg-gray-100 dvx:dark:bg-[#1a1a1a] dvx:rounded-xl dvx:shadow-inner dvx:mb-2">
            <button
              type="button"
              onClick={() => setMode("double")}
              className={`dvx:flex-1 dvx:px-3 dvx:py-2 dvx:text-xs dvx:font-bold dvx:rounded-lg dvx:transition-all ${
                mode === "double"
                  ? "dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:text-amber-500 dvx:shadow-md"
                  : "dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-900 dvx:dark:hover:text-white"
              }`}
            >
              {t("add_mode_double")}
            </button>
            <button
              type="button"
              onClick={() => poolHasLiquidity && setMode("single")}
              disabled={!poolHasLiquidity}
              title={
                !poolHasLiquidity ? t("add_single_requires_pool") : undefined
              }
              className={`dvx:flex-1 dvx:px-3 dvx:py-2 dvx:text-xs dvx:font-bold dvx:rounded-lg dvx:transition-all dvx:disabled:opacity-40 dvx:disabled:cursor-not-allowed ${
                mode === "single"
                  ? "dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:text-amber-500 dvx:shadow-md"
                  : "dvx:text-gray-400 dvx:bg-transparent dvx:hover:text-gray-900 dvx:dark:hover:text-white"
              }`}
            >
              {t("add_mode_single")}
            </button>
          </div>

          <div className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4">
            <div className="dvx:flex dvx:items-center dvx:justify-between dvx:mb-3">
              <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400">
                {t("add_token1")}
              </p>
              <div className="dvx:flex dvx:items-center dvx:gap-2">
                <span className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-500">
                  {t("balance")}:{" "}
                  <span className="dvx:text-amber-500">{balanceDisplayA}</span>
                </span>
                {tokenA && balanceRawA !== "0" && (
                  <button
                    onClick={() =>
                      handleAmountA(
                        new BigNumber(balanceRawA)
                          .shiftedBy(-tokenA.decimals)
                          .toFixed(tokenA.decimals, BigNumber.ROUND_DOWN),
                      )
                    }
                    className="dvx:text-[10px] dvx:font-bold dvx:px-1.5 dvx:py-0.5 dvx:rounded dvx:bg-amber-500/20 dvx:text-amber-500 dvx:hover:bg-amber-500/30 dvx:transition"
                  >
                    MAX
                  </button>
                )}
              </div>
            </div>
            <div
              className={`dvx:flex dvx:items-center dvx:gap-3 dvx:transition-opacity ${mode === "single" && singleSide !== "A" ? "dvx:opacity-50" : ""}`}
            >
              <TokenSelect
                value={tokenA}
                onChange={selectTokenA}
                tokens={tokenAOptions}
                exclude={tokenB?.identifier}
                loading={tokensLoading}
              />
              <input
                type="number"
                min="0"
                placeholder="0.0"
                value={amountA}
                onChange={(e) => handleAmountA(e.target.value)}
                className={`dvx:w-28 dvx:xs:w-36 dvx:flex-shrink-0 dvx:rounded-xl dvx:border dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-2.5 dvx:text-right dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 ${aErr ? "dvx:border-red-400 dvx:focus:ring-red-400" : "dvx:border-gray-200 dvx:dark:border-[#444] dvx:focus:ring-amber-500"}`}
              />
            </div>
            {amountAUsd && (
              <p className="dvx:mt-1 dvx:text-[10px] dvx:text-gray-400 dvx:text-right">
                ≈ {amountAUsd}
              </p>
            )}
          </div>

          <div className="dvx:flex dvx:justify-center dvx:-my-3 dvx:relative dvx:z-10">
            <div className="dvx:rounded-full dvx:p-1.5 dvx:bg-[#ffffff] dvx:dark:bg-[#1a1a1a] dvx:border dvx:border-gray-200 dvx:dark:border-[#333]">
              {mode === "single" ? (
                <Shuffle className="dvx:w-4 dvx:h-4 dvx:text-amber-500" />
              ) : (
                <Plus className="dvx:w-4 dvx:h-4 dvx:text-amber-500" />
              )}
            </div>
          </div>

          {mode === "single" && (
            <p className="dvx:text-center dvx:text-[11px] dvx:text-gray-400 dvx:-mt-1 dvx:mb-1 dvx:px-2">
              {t("add_single_hint")}
            </p>
          )}
          {mode === "double" && initialRatioLoading && (
            <p className="dvx:text-center dvx:text-[11px] dvx:text-gray-400 dvx:-mt-1 dvx:mb-1 dvx:px-2 dvx:animate-pulse">
              {t("calculating")}
            </p>
          )}

          <div className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4">
            <div className="dvx:flex dvx:items-center dvx:justify-between dvx:mb-3">
              <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400">
                {t("add_token2")}
              </p>
              <div className="dvx:flex dvx:items-center dvx:gap-2">
                <span className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-500">
                  {t("balance")}:{" "}
                  <span className="dvx:text-amber-500">{balanceDisplayB}</span>
                </span>
                {tokenB && balanceRawB !== "0" && (
                  <button
                    onClick={() =>
                      handleAmountB(
                        new BigNumber(balanceRawB)
                          .shiftedBy(-tokenB.decimals)
                          .toFixed(tokenB.decimals, BigNumber.ROUND_DOWN),
                      )
                    }
                    className="dvx:text-[10px] dvx:font-bold dvx:px-1.5 dvx:py-0.5 dvx:rounded dvx:bg-amber-500/20 dvx:text-amber-500 dvx:hover:bg-amber-500/30 dvx:transition"
                  >
                    MAX
                  </button>
                )}
              </div>
            </div>
            <div
              className={`dvx:flex dvx:items-center dvx:gap-3 dvx:transition-opacity ${mode === "single" && singleSide !== "B" ? "dvx:opacity-50" : ""}`}
            >
              <TokenSelect
                value={tokenB}
                onChange={selectTokenB}
                tokens={tokenBChoices}
                exclude={tokenA?.identifier}
                loading={
                  tokensLoading ||
                  (allWalletTokensRaw.length > 0 && walletTokens.length === 0)
                }
              />
              <input
                type="number"
                min="0"
                placeholder="0.0"
                value={amountB}
                onChange={(e) => handleAmountB(e.target.value)}
                className={`dvx:w-28 dvx:xs:w-36 dvx:flex-shrink-0 dvx:rounded-xl dvx:border dvx:bg-[#ffffff] dvx:dark:bg-[#2a2a2a] dvx:px-3 dvx:py-2.5 dvx:text-right dvx:text-sm dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white dvx:focus:outline-none dvx:focus:ring-2 ${bErr ? "dvx:border-red-400 dvx:focus:ring-red-400" : "dvx:border-gray-200 dvx:dark:border-[#444] dvx:focus:ring-amber-500"}`}
              />
            </div>
            {amountBUsd && (
              <p className="dvx:mt-1 dvx:text-[10px] dvx:text-gray-400 dvx:text-right">
                ≈ {amountBUsd}
              </p>
            )}
          </div>

          {poolLoading && (
            <p className="dvx:text-center dvx:text-xs dvx:text-gray-500 dvx:mt-4 dvx:animate-pulse">
              {t("add_pool_searching")}
            </p>
          )}

          {!poolLoading && tokenA && tokenB && !pool && (
            <div className="dvx:rounded-xl dvx:border dvx:border-amber-200 dvx:bg-amber-50 dvx:dark:bg-amber-900/20 dvx:dark:border-amber-800 dvx:p-4 dvx:mt-4">
              <p className="dvx:text-sm dvx:font-semibold dvx:text-amber-600 dvx:dark:text-amber-400">
                {t("add_no_pool_title")}
              </p>
              <p className="dvx:text-xs dvx:text-amber-500 dvx:mt-1">
                {t("add_no_pool_desc")}
              </p>
              <button
                onClick={() =>
                  goTo("create-pool", {
                    tokenX: tokenA?.identifier ?? "",
                    tokenY: tokenB?.identifier ?? "",
                  })
                }
                className="dvx:mt-3 dvx:px-4 dvx:py-2 dvx:bg-amber-500 dvx:text-white dvx:rounded-lg dvx:text-xs dvx:font-bold dvx:hover:bg-amber-600 dvx:transition"
              >
                {t("add_no_pool_btn")}
              </button>
            </div>
          )}

          {pool && !pool.isActive && (
            <div className="dvx:rounded-xl dvx:border dvx:border-amber-200 dvx:bg-amber-50 dvx:dark:bg-amber-900/20 dvx:dark:border-amber-800 dvx:p-4 dvx:mt-4">
              <p className="dvx:text-sm dvx:font-semibold dvx:text-amber-600 dvx:dark:text-amber-400">
                {t("add_pool_inactive_title")}
              </p>
              <p className="dvx:text-xs dvx:text-amber-500 dvx:mt-1">
                {t("add_pool_inactive_desc")}
              </p>
              <button
                onClick={() =>
                  goTo("create-pool", {
                    tokenX: tokenA?.identifier ?? "",
                    tokenY: tokenB?.identifier ?? "",
                  })
                }
                className="dvx:mt-3 dvx:px-4 dvx:py-2 dvx:bg-amber-500 dvx:text-white dvx:rounded-lg dvx:text-xs dvx:font-bold dvx:hover:bg-amber-600 dvx:transition"
              >
                {t("add_pool_inactive_btn")}
              </button>
            </div>
          )}

          {pool && (
            <div className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-gray-50 dvx:dark:bg-[#1e1e1e] dvx:p-4 dvx:mt-4 dvx:space-y-2">
              <div className="dvx:flex dvx:items-center dvx:justify-between">
                <p className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400">
                  {t("add_pool_reserves")}
                </p>
                <a
                  href={`${explorerAddress}/accounts/${pool.address}/tokens`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={pool.address}
                  className="dvx:text-[10px] dvx:font-semibold dvx:text-amber-500 dvx:hover:text-amber-600 dvx:hover:underline"
                >
                  {t("add_pool_view_explorer")} ↗
                </a>
              </div>
              <div className="dvx:flex dvx:justify-between dvx:items-center dvx:text-sm">
                <span className="dvx:flex dvx:items-center dvx:gap-1.5 dvx:text-gray-500">
                  <TokenLogo
                    url={tokenA?.logoUrl}
                    ticker={tokenA?.ticker ?? "?"}
                  />
                  {tokenA?.ticker}
                </span>
                <span className="dvx:flex dvx:items-baseline dvx:justify-end dvx:gap-2 dvx:text-right">
                  <span className="dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white">
                    {reserveADisplay ?? "0"}
                  </span>
                  {reserveAUsd && (
                    <span className="dvx:text-[10px] dvx:text-gray-400">
                      {reserveAUsd}
                    </span>
                  )}
                </span>
              </div>
              <div className="dvx:flex dvx:justify-between dvx:items-center dvx:text-sm">
                <span className="dvx:flex dvx:items-center dvx:gap-1.5 dvx:text-gray-500">
                  <TokenLogo
                    url={tokenB?.logoUrl}
                    ticker={tokenB?.ticker ?? "?"}
                  />
                  {tokenB?.ticker}
                </span>
                <span className="dvx:flex dvx:items-baseline dvx:justify-end dvx:gap-2 dvx:text-right">
                  <span className="dvx:font-semibold dvx:text-gray-900 dvx:dark:text-white">
                    {reserveBDisplay ?? "0"}
                  </span>
                  {reserveBUsd && (
                    <span className="dvx:text-[10px] dvx:text-gray-400">
                      {reserveBUsd}
                    </span>
                  )}
                </span>
              </div>
              {poolApr?.aprPct != null && (
                <div className="dvx:flex dvx:justify-between dvx:items-center dvx:text-sm dvx:pt-2 dvx:mt-1 dvx:border-t dvx:border-gray-200 dvx:dark:border-[#333]">
                  <span className="dvx:flex dvx:items-center dvx:gap-1 dvx:text-gray-500">
                    {t("add_pool_apr", { days: poolApr.windowDays })}
                    <span
                      className="dvx:cursor-help"
                      title={[
                        t("add_pool_apr_tooltip_intro"),
                        "",
                        `• ${t("add_pool_apr_tooltip_window", { days: poolApr.windowDays })}`,
                        ...(tokenA?.identifier === VOXEGLD_IDENTIFIER ||
                        tokenB?.identifier === VOXEGLD_IDENTIFIER
                          ? ["", `• ${t("add_pool_apr_tooltip_voxegld")}`]
                          : []),
                      ].join("\n")}
                    >
                      <Info className="dvx:w-3 dvx:h-3 dvx:text-gray-400" />
                    </span>
                  </span>
                  <span className="dvx:font-bold dvx:text-green-500">
                    {parseFloat(poolApr.aprPct).toFixed(2)}%
                  </span>
                </div>
              )}
              {recentSwaps.length > 0 && (
                <div className="dvx:pt-2 dvx:mt-1 dvx:border-t dvx:border-gray-200 dvx:dark:border-[#333]">
                  <button
                    type="button"
                    onClick={() => setRecentSwapsExpanded((v) => !v)}
                    className="dvx:w-full dvx:flex dvx:items-center dvx:justify-between dvx:text-sm dvx:text-gray-500 dvx:bg-transparent dvx:hover:text-gray-700 dvx:dark:hover:text-gray-300 dvx:transition"
                  >
                    <span>
                      {t("add_pool_recent_swaps", { count: recentSwaps.length })}
                    </span>
                    <ChevronDown
                      className={`dvx:w-4 dvx:h-4 dvx:transition-transform ${recentSwapsExpanded ? "dvx:rotate-180" : ""}`}
                    />
                  </button>
                  {recentSwapsExpanded && (
                    <div className="dvx:mt-2 dvx:space-y-1.5">
                      {recentSwaps.map((swap) => {
                        const tIn =
                          swap.tokenIn === tokenA?.identifier
                            ? tokenA
                            : swap.tokenIn === tokenB?.identifier
                              ? tokenB
                              : null;
                        const tOut =
                          swap.tokenOut === tokenA?.identifier
                            ? tokenA
                            : swap.tokenOut === tokenB?.identifier
                              ? tokenB
                              : null;
                        const amtIn = tIn
                          ? formatTokenAmount(
                              new BigNumber(swap.amountIn).shiftedBy(-tIn.decimals),
                            )
                          : swap.amountIn;
                        const amtOut = tOut
                          ? formatTokenAmount(
                              new BigNumber(swap.amountOut).shiftedBy(-tOut.decimals),
                            )
                          : swap.amountOut;
                        return (
                          <a
                            key={swap.id}
                            href={`${explorerAddress}/transactions/${swap.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="dvx:flex dvx:items-center dvx:justify-between dvx:gap-2 dvx:text-xs dvx:rounded-lg dvx:px-2.5 dvx:py-1.5 dvx:bg-[#ffffff] dvx:dark:bg-[#1a1a1a] dvx:hover:bg-gray-100 dvx:dark:hover:bg-[#252525] dvx:transition"
                          >
                            <span className="dvx:flex dvx:items-center dvx:gap-1 dvx:min-w-0 dvx:text-gray-700 dvx:dark:text-gray-300">
                              <span className="dvx:truncate">
                                {amtIn} {tIn?.ticker ?? "?"}
                              </span>
                              <ArrowRight className="dvx:w-3 dvx:h-3 dvx:text-gray-400 dvx:shrink-0" />
                              <span className="dvx:truncate">
                                {amtOut} {tOut?.ticker ?? "?"}
                              </span>
                            </span>
                            <span className="dvx:text-gray-400 dvx:shrink-0">
                              {formatRelativeTime(swap.timestamp, t)}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {!poolHasLiquidity && (
                <p className="dvx:text-[11px] dvx:text-gray-400 dvx:pt-1">
                  {t("add_pool_empty")}
                </p>
              )}
            </div>
          )}

          {mode === "double" && pool && lpPreview !== null && (
            <div className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-[#ffffff] dvx:dark:bg-[#1a1a1a] dvx:p-4 dvx:mt-4 dvx:space-y-2">
              <div className="dvx:flex dvx:justify-between dvx:text-sm">
                <span className="dvx:text-gray-500">{t("add_lp_preview")}</span>
                <span className="dvx:font-bold dvx:text-amber-500">
                  {formatTokenAmount(
                    new BigNumber(lpPreview.toString()).shiftedBy(-18),
                    18,
                  )}{" "}
                  LP
                </span>
              </div>
              {doublePoolShare && (
                <div className="dvx:flex dvx:justify-between dvx:text-xs">
                  <span className="dvx:text-gray-500">{t("add_pool_share")}</span>
                  <span className="dvx:font-medium dvx:text-gray-700 dvx:dark:text-gray-300">
                    {formatPoolShare(doublePoolShare)}
                  </span>
                </div>
              )}
              {refundA > 0n && (
                <div className="dvx:flex dvx:justify-between dvx:text-xs">
                  <span className="dvx:text-gray-500">
                    {t("add_refund", { ticker: tokenA?.ticker })}
                  </span>
                  <span className="dvx:font-medium dvx:text-gray-700 dvx:dark:text-gray-300">
                    {formatTokenAmount(
                      new BigNumber(refundA.toString()).shiftedBy(
                        -(tokenA?.decimals ?? 18),
                      ),
                    )}
                  </span>
                </div>
              )}
              {refundB > 0n && (
                <div className="dvx:flex dvx:justify-between dvx:text-xs">
                  <span className="dvx:text-gray-500">
                    {t("add_refund", { ticker: tokenB?.ticker })}
                  </span>
                  <span className="dvx:font-medium dvx:text-gray-700 dvx:dark:text-gray-300">
                    {formatTokenAmount(
                      new BigNumber(refundB.toString()).shiftedBy(
                        -(tokenB?.decimals ?? 18),
                      ),
                    )}
                  </span>
                </div>
              )}
              {lpPreview < 1000n && !poolHasLiquidity && (
                <p className="dvx:text-xs dvx:text-red-500 dvx:mt-2">
                  {t("add_min_deposit")}
                </p>
              )}
            </div>
          )}

          {mode === "single" &&
            pool &&
            (singleQuoteLoading ||
              singleLpPreview !== null ||
              singleQuoteError) && (
              <div className="dvx:rounded-2xl dvx:border dvx:border-gray-200 dvx:dark:border-[#333] dvx:bg-[#ffffff] dvx:dark:bg-[#1a1a1a] dvx:p-4 dvx:mt-4 dvx:space-y-3">
                <div className="dvx:flex dvx:justify-between dvx:text-sm dvx:items-center">
                  <span className="dvx:text-gray-500">{t("add_lp_preview")}</span>
                  {singleQuoteLoading ? (
                    <span className="dvx:text-xs dvx:text-gray-400 dvx:animate-pulse">
                      {t("calculating")}
                    </span>
                  ) : singleQuoteError ? (
                    <span className="dvx:text-xs dvx:text-red-500">
                      {t("add_single_quote_unavailable")}
                    </span>
                  ) : singleLpPreview !== null ? (
                    <span className="dvx:font-bold dvx:text-amber-500">
                      {formatTokenAmount(
                        new BigNumber(singleLpPreview.toString()).shiftedBy(-18),
                        18,
                      )}{" "}
                      LP
                    </span>
                  ) : null}
                </div>
                {singlePoolShare && !singleQuoteError && (
                  <div className="dvx:flex dvx:justify-between dvx:text-xs">
                    <span className="dvx:text-gray-500">{t("add_pool_share")}</span>
                    <span className="dvx:font-medium dvx:text-gray-700 dvx:dark:text-gray-300">
                      {formatPoolShare(singlePoolShare)}
                    </span>
                  </div>
                )}
                {singleLpPreview !== null && !singleQuoteError && (
                  <div className="dvx:flex dvx:items-center dvx:justify-between">
                    <span className="dvx:text-[10px] dvx:font-semibold dvx:uppercase dvx:tracking-wider dvx:text-gray-400">
                      {t("slippage")}
                    </span>
                    <div className="dvx:flex dvx:gap-1">
                      {SINGLE_SLIPPAGE_PRESETS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSingleSlippage(s)}
                          className={`dvx:px-2 dvx:py-1 dvx:rounded-lg dvx:text-[10px] dvx:font-bold dvx:transition ${
                            singleSlippage === s
                              ? "dvx:bg-amber-500 dvx:text-white"
                              : "dvx:bg-gray-100 dvx:dark:bg-[#2a2a2a] dvx:text-gray-500 dvx:hover:bg-amber-100 dvx:dark:hover:bg-amber-900/30"
                          }`}
                        >
                          {(s * 100).toFixed(1)}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          <button
            onClick={
              !address
                ? onConnect
                : mode === "double"
                  ? handleTx
                  : handleSingleTx
            }
            disabled={
              !address
                ? !onConnect
                : mode === "double"
                  ? !pool ||
                    !pool.isActive ||
                    aErr ||
                    bErr ||
                    !amountA ||
                    !amountB ||
                    (lpPreview !== null &&
                      lpPreview < 1000n &&
                      !poolHasLiquidity)
                  : !pool ||
                    !pool.isActive ||
                    !poolHasLiquidity ||
                    singleErr ||
                    !singleAmount ||
                    singleQuoteLoading ||
                    singleQuoteError ||
                    singleLpPreview === null
            }
            style={{ minHeight: "36px" }}
            className="dinoButton dvx:w-full dvx:text-base dvx:mt-4 dvx:disabled:opacity-40 dvx:disabled:cursor-not-allowed"
          >
            {!address
              ? t("add_btn_connect")
              : !pool
                ? t("add_btn_no_pool")
                : !pool.isActive
                  ? t("add_btn_inactive")
                  : mode === "double"
                    ? aErr || bErr
                      ? t("add_btn_insufficient")
                      : !amountA || !amountB
                        ? t("add_btn_enter_amount")
                        : lpPreview !== null &&
                            lpPreview < 1000n &&
                            !poolHasLiquidity
                          ? t("add_btn_min")
                          : t("add_btn_submit")
                    : !poolHasLiquidity
                      ? t("add_single_requires_pool")
                      : singleErr
                        ? t("add_btn_insufficient")
                        : !singleAmount
                          ? t("add_btn_enter_amount")
                          : singleQuoteLoading
                            ? t("calculating")
                            : singleQuoteError
                              ? t("add_single_quote_unavailable")
                              : t("add_btn_submit")}
          </button>
        </div>
      </Card>
    </div>
  );
};
