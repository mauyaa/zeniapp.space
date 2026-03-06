import { useEffect, useRef } from 'react';

type UseKineticRingOptions = {
  images: string[];
  reduceMotion?: boolean;
  gsap?: {
    set: (target: Element | object, vars: Record<string, unknown>) => void;
  } | null;
};

export function useKineticRing(options: UseKineticRingOptions) {
  const { images, reduceMotion = false, gsap } = options;
  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);

  const rotationY = useRef(0);
  const targetRotationY = useRef(0);
  const velocity = useRef(0.5);
  const isDragging = useRef(false);
  const startX = useRef(0);

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;

    const friction = reduceMotion ? 0.95 : 0.985;
    let rafId: number;

    const update = () => {
      if (!isDragging.current) {
        targetRotationY.current += velocity.current;
        velocity.current *= friction;
        if (Math.abs(velocity.current) < 0.2) velocity.current = 0.2;
      }

      rotationY.current += (targetRotationY.current - rotationY.current) * 0.1;

      if (gsap) {
        gsap.set(ring, { rotateY: rotationY.current });
      } else {
        ring.style.transform = `rotateY(${rotationY.current}deg)`;
      }

      const items = ring.querySelectorAll('.ring-item');
      items.forEach((item: Element, index: number) => {
        let angle = (rotationY.current + index * 45) % 360;
        if (angle < 0) angle += 360;

        // Normalize angle so 0 is front-center, and it goes from -180 to 180
        let normAngle = angle;
        if (normAngle > 180) normAngle -= 360;
        const absAngle = Math.abs(normAngle);

        // progress: 1 is front, 0 is back
        const progress = 1 - absAngle / 180;

        // Continuous smooth values
        // Keep rear cards readable while still preserving depth.
        const scale = 0.93 + progress * 0.07;
        const opacity = 0.72 + progress * 0.28;
        const blur = (1 - progress) * 1.1;
        const brightness = 0.82 + progress * 0.24;
        const saturation = 0.98 + progress * 0.22;
        const contrast = 0.96 + progress * 0.12;
        const zIndex = Math.round(progress * 100);

        const element = item as HTMLElement;
        element.style.filter = `blur(${blur}px) brightness(${brightness}) saturate(${saturation}) contrast(${contrast})`;
        element.style.opacity = opacity.toString();
        element.style.zIndex = zIndex.toString();

        if (element.children[0]) {
          (element.children[0] as HTMLElement).style.transform = `scale(${scale})`;
        }
      });

      if (ballRef.current) {
        ballRef.current.style.transform = `translate(-50%, -50%) translateZ(0) rotateY(${-rotationY.current}deg)`;
      }

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [images.length, reduceMotion, gsap]);

  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    if (stageRef.current) stageRef.current.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - startX.current;
    velocity.current = deltaX * 0.35;
    targetRotationY.current += velocity.current;
    startX.current = e.clientX;
  };

  const onPointerUp = () => {
    isDragging.current = false;
  };

  return {
    stageRef,
    ringRef,
    ballRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
