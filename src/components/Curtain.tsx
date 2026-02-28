import React, { useEffect, useState } from 'react';

/**
 * Full-viewport curtain that "slams" from bottom to top (shutter wipe) when revealing content.
 * Used on initial load and optionally on route transitions. No fade — transform-only for smooth, fast reveal.
 */
export function Curtain() {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let id: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        id = setTimeout(() => {
          if (!cancelled) setRevealed(true);
        }, 50);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (id != null) clearTimeout(id);
    };
  }, []);

  return (
    <div
      className="curtain"
      data-revealed={revealed}
      aria-hidden="true"
      style={{ pointerEvents: revealed ? 'none' : 'auto' }}
    />
  );
}
