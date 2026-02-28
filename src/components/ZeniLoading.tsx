import React from 'react';

/**
 * Full-screen loading screen shown while the app or a route is loading.
 * White background, centered ZENI. brand with animated green/black sweeps and shapes.
 */
export function ZeniLoading() {
  return (
    <div
      className="flex min-h-screen w-full items-center justify-center overflow-hidden bg-white"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="relative flex h-[400px] w-[400px] items-center justify-center">
        {/* Brand centered on top */}
        <div className="absolute z-10 flex items-baseline bg-white p-2.5 text-[56px] font-black tracking-tight text-black">
          ZENI<span className="ml-0.5 text-[64px] leading-none text-green-500">.</span>
        </div>

        {/* Animated elements */}
        <div className="relative z-[1] h-[300px] w-[300px]">
          <div
            className="absolute left-[30%] h-[100px] w-[6px] bg-green-500 opacity-80"
            style={{ animation: 'zeni-load-move-h 2s infinite cubic-bezier(0.65, 0.05, 0.36, 1)' }}
            aria-hidden
          />
          <div
            className="absolute top-[40%] h-[120px] w-[6px] bg-black opacity-60"
            style={{
              transform: 'rotate(90deg)',
              animation: 'zeni-load-move-v 2.5s infinite cubic-bezier(0.65, 0.05, 0.36, 1)',
            }}
            aria-hidden
          />
          <div
            className="absolute left-[15%] top-[15%] h-6 w-6 bg-black"
            style={{ animation: 'zeni-load-rot 2s infinite cubic-bezier(0.65, 0.05, 0.36, 1)' }}
            aria-hidden
          />
          <div
            className="absolute bottom-[20%] right-[20%] h-5 w-5 rounded-full bg-green-500"
            style={{ animation: 'zeni-load-scale 1.5s infinite cubic-bezier(0.65, 0.05, 0.36, 1)' }}
            aria-hidden
          />
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
