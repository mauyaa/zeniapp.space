import { useEffect, useState } from 'react';
import type { ScrollTrigger as ScrollTriggerType } from 'gsap/ScrollTrigger';

type LenisInstance = import('lenis').default;

export type MotionLibs = {
  gsap: typeof import('gsap');
  ScrollTrigger: ScrollTriggerType;
  Lenis: typeof import('lenis').default;
};

export function useMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [libs, setLibs] = useState<MotionLibs | null>(null);
  const [lenisInstance, setLenisInstance] = useState<LenisInstance | null>(null);

  const disableMotion = reduceMotion || coarsePointer;
  const motionEnabled = !disableMotion;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(pointer: coarse)');
    const update = () => {
      setReduceMotion(reduce.matches);
      setCoarsePointer(coarse.matches);
    };
    update();
    reduce.addEventListener('change', update);
    coarse.addEventListener('change', update);
    return () => {
      reduce.removeEventListener('change', update);
      coarse.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    if (disableMotion) {
      setLibs(null);
      setLenisInstance(null);
      return;
    }
    let active = true;
    (async () => {
      try {
        const [{ default: gsapLib }, { ScrollTrigger }, { default: LenisLib }] = await Promise.all([
          import('gsap'),
          import('gsap/ScrollTrigger'),
          import('lenis'),
        ]);
        if (!active) return;
        gsapLib.registerPlugin(ScrollTrigger);
        setLibs({ gsap: gsapLib, ScrollTrigger, Lenis: LenisLib });
      } catch (err) {
        console.error('Failed to load motion libraries', err);
        setLibs(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [disableMotion]);

  useEffect(() => {
    const gsap = libs?.gsap;
    const ScrollTrigger = libs?.ScrollTrigger;
    const Lenis = libs?.Lenis;
    if (disableMotion || !gsap || !ScrollTrigger || !Lenis) {
      setLenisInstance(null);
      document.body.classList.remove('cursor-hidden');
      return;
    }
    document.body.classList.add('cursor-hidden');
    let lenis: LenisInstance | null = null;
    try {
      lenis = new Lenis({
        duration: 1.1,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      setLenisInstance(lenis);
    } catch (err) {
      console.error('Lenis init failed', err);
      document.body.classList.remove('cursor-hidden');
      return;
    }
    let rafId = 0;
    let active = true;
    const raf = (time: number) => {
      if (!active) return;
      lenis!.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);
    lenis?.on('scroll', ScrollTrigger.update);
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      lenis?.off('scroll', ScrollTrigger.update);
      lenis?.destroy();
      setLenisInstance(null);
      document.body.classList.remove('cursor-hidden');
    };
  }, [disableMotion, libs]);

  return {
    motionEnabled,
    reduceMotion,
    coarsePointer,
    disableMotion,
    gsap: libs?.gsap ?? null,
    lenis: lenisInstance,
    ScrollTrigger: libs?.ScrollTrigger ?? null,
  };
}
