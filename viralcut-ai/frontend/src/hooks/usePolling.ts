import { useEffect, useRef } from "react";

/** Calls `callback` every `intervalMs` while `active` is true. Skips overlapping calls. */
export function usePolling(callback: () => Promise<void> | void, intervalMs: number, active: boolean) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let inFlight = false;

    const tick = async () => {
      if (inFlight || cancelled) return;
      inFlight = true;
      try {
        await savedCallback.current();
      } finally {
        inFlight = false;
      }
    };

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs, active]);
}
