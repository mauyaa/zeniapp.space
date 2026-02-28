import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Slim top progress bar that shows during route transitions.
 * Inspired by YouTube / GitHub — gives users instant feedback that something is loading.
 *
 * Uses CSS transforms (GPU-accelerated) for buttery smooth animation.
 * Auto-hides when navigation completes.
 */
export function NavigationProgress() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    // Only trigger on actual path changes
    if (prevPath.current === location.pathname) return;
    prevPath.current = location.pathname;

    // Start the progress bar
    setVisible(true);
    setProgress(0);

    // Quick initial jump — smooth and fast
    const t1 = setTimeout(() => setProgress(40), 0);
    const t2 = setTimeout(() => setProgress(85), 120);
    const t3 = setTimeout(() => setProgress(100), 220);
    const t4 = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 320);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [location.pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page loading"
    >
      <div
        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? '150ms' : '300ms',
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
