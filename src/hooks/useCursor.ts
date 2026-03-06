import { useEffect, useRef } from 'react';

type GsapLike = {
  quickTo: (
    target: Element | object,
    property: string,
    vars: Record<string, unknown>
  ) => (value: number) => void;
};

type UseCursorOptions = {
  enabled: boolean;
  gsap: GsapLike | null;
};

export function useCursor(options: UseCursorOptions) {
  const { enabled, gsap } = options;
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorCircleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !gsap) return;

    const gsapDotX = cursorDotRef.current
      ? gsap.quickTo(cursorDotRef.current, 'x', { duration: 0.08, ease: 'power2.out' })
      : null;
    const gsapDotY = cursorDotRef.current
      ? gsap.quickTo(cursorDotRef.current, 'y', { duration: 0.08, ease: 'power2.out' })
      : null;
    const gsapCircleX = cursorCircleRef.current
      ? gsap.quickTo(cursorCircleRef.current, 'x', { duration: 0.28, ease: 'power2.out' })
      : null;
    const gsapCircleY = cursorCircleRef.current
      ? gsap.quickTo(cursorCircleRef.current, 'y', { duration: 0.28, ease: 'power2.out' })
      : null;

    let moveRaf = 0;
    let lastX = 0;
    let lastY = 0;
    const moveCursor = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (moveRaf) return;
      moveRaf = requestAnimationFrame(() => {
        gsapDotX?.(lastX);
        gsapDotY?.(lastY);
        gsapCircleX?.(lastX);
        gsapCircleY?.(lastY);
        moveRaf = 0;
      });
    };

    window.addEventListener('mousemove', moveCursor);
    return () => {
      if (moveRaf) cancelAnimationFrame(moveRaf);
      window.removeEventListener('mousemove', moveCursor);
    };
  }, [enabled, gsap]);

  return { cursorDotRef, cursorCircleRef };
}
