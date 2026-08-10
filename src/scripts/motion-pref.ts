/**
 * Single source of truth for `prefers-reduced-motion` across the tools.
 *
 * The tools previously read this four different ways, all of them once at
 * init — so toggling the OS setting mid-session did nothing. This observer
 * reports changes as they happen.
 */

const QUERY = '(prefers-reduced-motion: reduce)';

function mediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(QUERY);
}

export function prefersReducedMotion(): boolean {
  return mediaQuery()?.matches ?? false;
}

/**
 * Calls `cb` immediately with the current value, then on every change.
 * Returns an unsubscribe function.
 */
export function onReducedMotion(cb: (reduced: boolean) => void): () => void {
  const mql = mediaQuery();
  cb(mql?.matches ?? false);
  if (!mql) return () => {};

  const handler = (e: MediaQueryListEvent | { matches: boolean }) => cb(e.matches);
  mql.addEventListener('change', handler as EventListener);
  return () => mql.removeEventListener('change', handler as EventListener);
}
