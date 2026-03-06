import { useEffect } from 'react';

/**
 * Signal passed to the async runner. After the effect cleans up (unmount or deps change),
 * `cancelled` becomes true. Check it after any await before calling setState to avoid
 * "Can't perform state update on unmounted component" and stale updates.
 */
export type AsyncEffectSignal = {
  get cancelled(): boolean;
};

/**
 * Runs an async function inside a React effect and cancels it on unmount or when deps change.
 *
 * Pattern: use this whenever you have useEffect + async fetch + "isCancelled" guard + cleanup.
 * The hook encapsulates the cancellation flag and cleanup; your runner does the fetch and
 * checks signal.cancelled after awaits before updating state.
 *
 * @param run - Async function. Check signal.cancelled after any await before calling setState.
 * @param deps - Same as useEffect dependency list. Effect re-runs when deps change; previous run is cancelled.
 *
 * @example
 * useAsyncEffect(async (signal) => {
 *   setLoading(true);
 *   try {
 *     const res = await fetchSomething();
 *     if (signal.cancelled) return;
 *     setData(res);
 *   } finally {
 *     if (!signal.cancelled) setLoading(false);
 *   }
 * }, []);
 */
export function useAsyncEffect(
  run: (signal: AsyncEffectSignal) => Promise<void>,
  deps: readonly unknown[]
): void {
  useEffect(() => {
    let cancelled = false;
    const signal: AsyncEffectSignal = {
      get cancelled() {
        return cancelled;
      },
    };
    run(signal).catch(() => {
      // Swallow unhandled rejections from the runner so they don't become unhandled promise rejections.
      // Caller should use try/catch inside run if they need to set error state.
    });
    return () => {
      cancelled = true;
    };
    // This hook intentionally forwards caller-managed dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
