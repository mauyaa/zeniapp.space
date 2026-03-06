import { useEffect, useRef } from 'react';

type GsapLike = {
  to: (target: Element | NodeListOf<Element>, vars: Record<string, unknown>) => void;
  fromTo: (
    target: Element | NodeListOf<Element>,
    fromVars: Record<string, unknown>,
    toVars: Record<string, unknown>
  ) => void;
};

type UseMenuOptions = {
  menuOpen: boolean;
  disableMotion: boolean;
  gsap: GsapLike | null;
};

export function useMenu(options: UseMenuOptions) {
  const { menuOpen, disableMotion, gsap } = options;
  const menuOverlayRef = useRef<HTMLDivElement>(null);
  const menuWasOpen = useRef(false);

  useEffect(() => {
    const overlay = menuOverlayRef.current;
    if (!overlay) return;

    if (disableMotion || !gsap) {
      overlay.style.transform = menuOpen ? 'translateY(0%)' : 'translateY(-100%)';
      overlay.style.visibility = menuOpen ? 'visible' : 'hidden';
      overlay.style.pointerEvents = menuOpen ? 'auto' : 'none';
      menuWasOpen.current = menuOpen;
      return;
    }

    if (menuOpen) {
      menuWasOpen.current = true;
      overlay.style.visibility = 'visible';
      overlay.style.pointerEvents = 'auto';
      gsap.to(overlay, { y: '0%', duration: 0.8, ease: 'power3.inOut' });
      const links = overlay.querySelectorAll('.menu-link');
      if (links.length) {
        gsap.fromTo(
          links,
          { y: 50, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: 'power3.out', delay: 0.3 }
        );
      }
    } else {
      if (!menuWasOpen.current) {
        overlay.style.transform = 'translateY(-100%)';
        overlay.style.visibility = 'hidden';
        overlay.style.pointerEvents = 'none';
        return;
      }
      gsap.to(overlay, {
        y: '-100%',
        duration: 0.8,
        ease: 'power3.inOut',
        onComplete: () => {
          if (!menuOverlayRef.current) return;
          menuOverlayRef.current.style.visibility = 'hidden';
          menuOverlayRef.current.style.pointerEvents = 'none';
        },
      });
    }
  }, [menuOpen, disableMotion, gsap]);

  return { menuOverlayRef, menuWasOpen };
}
