/**
 * Single source of truth for "is this element under a dark or light ancestor",
 * used by every component that needs this outside of a plain Tailwind `dark:`
 * class (TokenSelect's inline-styled dropdown, SwapWidget's own theme-class
 * decision). Mirrors the compiled CSS custom-variant in widget.css —
 * `:is(.dark *):not(:is(.light *))` — where the *nearest* `.dark`/`.light`
 * ancestor wins, rather than "any .dark ancestor, ignoring .light".
 *
 * Before this existed, TokenSelect and SwapWidget each had their own
 * independent (and slightly different) detection logic, which could disagree
 * whenever a host placed `.dark`/`.light` somewhere other than `<html>` —
 * e.g. the widget mounted inside an explicitly-light sub-section of an
 * otherwise-dark host page.
 */
export function getNearestThemeAncestor(el: Element | null): 'dark' | 'light' | null {
  const nearest = el?.closest('.dark, .light');
  if (!nearest) return null;
  return nearest.classList.contains('dark') ? 'dark' : 'light';
}
