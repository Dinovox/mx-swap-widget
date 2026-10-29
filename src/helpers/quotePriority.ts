/**
 * Tickers des tokens "souche" (référence) à toujours afficher comme devise
 * de cotation d'un carnet d'ordres, par ordre de priorité décroissant.
 * Basé sur le TICKER (pas l'identifiant complet) pour fonctionner
 * identiquement sur mainnet et devnet, même quand un token donné n'a pas
 * d'équivalent déployé sur l'un des deux réseaux (ex: VOXEGLD, absent de
 * devnet aujourd'hui) — comparer sur l'identifiant forcerait à maintenir
 * une liste séparée par réseau pour rien.
 */
export const QUOTE_PRIORITY_TICKERS = ["USDC", "WEGLD", "VOXEGLD"];

function priorityIndex(ticker: string): number {
  const idx = QUOTE_PRIORITY_TICKERS.indexOf(ticker);
  return idx === -1 ? Infinity : idx;
}

export interface QuoteCandidate {
  identifier: string;
  ticker: string;
  decimals: number;
}

/**
 * Décide quel des deux tokens d'une paire doit s'afficher comme "quote"
 * (dénominateur — le carnet affiche "prix de 1 base en quote") : le token
 * de priorité la plus haute dans QUOTE_PRIORITY_TICKERS l'emporte. Si
 * aucun des deux n'est une souche reconnue (paire arbitraire, ex. deux
 * tokens de projet quelconques comme OLV/BOD), aucune préférence :
 * conserve la convention canonique on-chain (tokenA=base, tokenB=quote)
 * inchangée plutôt que de réordonner sans raison.
 *
 * `invert` (contrôlé par l'utilisateur via le bouton d'inversion) retourne
 * simplement le résultat inverse — permet toujours de voir l'autre sens,
 * y compris sur une paire avec souche reconnue.
 */
export function orderForQuoteDisplay(
  tokenA: QuoteCandidate,
  tokenB: QuoteCandidate,
  invert: boolean,
): { base: QuoteCandidate; quote: QuoteCandidate } {
  const idxA = priorityIndex(tokenA.ticker);
  const idxB = priorityIndex(tokenB.ticker);
  const { base, quote } =
    idxA < idxB ? { base: tokenB, quote: tokenA } : idxB < idxA ? { base: tokenA, quote: tokenB } : { base: tokenA, quote: tokenB };
  return invert ? { base: quote, quote: base } : { base, quote };
}
