import { useEffect, useRef } from 'react';

type GSAP = typeof import('gsap');

type UseKineticRingOptions = {
  images: string[];
  reduceMotion?: boolean;
  gsap?: GSAP | null;
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
  const ringItemFrontRef = useRef<boolean[]>([]);

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
      items.forEach((item, index) => {
        const angle = (rotationY.current + index * 45) % 360;
        const normAngle = Math.abs(angle < 0 ? angle + 360 : angle);
        const isFront = normAngle < 35 || normAngle > 325;
        const prevFront = ringItemFrontRef.current[index];
        if (prevFront === isFront) return;

        ringItemFrontRef.current[index] = isFront;
        const element = item as HTMLElement;
        if (isFront) {
          element.style.filter = 'blur(0) brightness(1.02)';
          element.style.opacity = '1';
          element.style.zIndex = '30';
          if (element.children[0]) (element.children[0] as HTMLElement).style.transform = 'scale(1.02)';
        } else {
          element.style.filter = 'blur(0) brightness(0.9)';
          element.style.opacity = '0.85';
          element.style.zIndex = '1';
          if (element.children[0]) (element.children[0] as HTMLElement).style.transform = 'scale(1)';
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
