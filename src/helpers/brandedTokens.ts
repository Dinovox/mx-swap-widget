import type { DexToken } from "../types";

/** VOX-EGLD (DinoVox's liquid-staking token) — pinned first wherever branded tokens are listed. */
export const VOXEGLD_IDENTIFIER = "VOXEGLD-5872e5";

/**
 * Tokens the DEX API hasn't branded aren't offered for pair creation or
 * liquidity provision — creating a pool (or adding liquidity to one) against
 * a token with no vetted identity is how users end up on a pair for a scam
 * copy of a real token. `logoUrl` is the one signal the API currently
 * guarantees for this (an unbranded token has, at minimum, no logo); there's
 * no other field to fall back on today.
 *
 * VOXEGLD is pinned first regardless of its position in the source list;
 * every other token keeps whatever order the API returned them in.
 */
export function brandedTokensVoxEgldFirst(tokens: DexToken[]): DexToken[] {
  const branded = tokens.filter((t) => !!t.logoUrl);
  const vox = branded.find((t) => t.identifier === VOXEGLD_IDENTIFIER);
  if (!vox) return branded;
  return [vox, ...branded.filter((t) => t.identifier !== VOXEGLD_IDENTIFIER)];
}
