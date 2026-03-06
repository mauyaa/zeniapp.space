import React, { useCallback, useRef } from 'react';

interface PriceRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  valueMin: number;
  valueMax: number;
  onChangeMin: (v: number) => void;
  onChangeMax: (v: number) => void;
  formatLabel?: (v: number) => string;
}

const defaultFormat = (v: number) =>
  v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
      ? `${(v / 1_000).toFixed(0)}K`
      : String(v);

/**
 * Dual-handle price range slider — pure CSS, no extra library.
 * Works with KES amounts. GPU-composited track fill via CSS custom properties.
 */
export function PriceRangeSlider({
  min,
  max,
  step = 5_000,
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
  formatLabel = defaultFormat,
}: PriceRangeSliderProps) {
  const pct = useCallback((v: number) => ((v - min) / (max - min)) * 100, [min, max]);

  const trackRef = useRef<HTMLDivElement>(null);

  const fillLeft = pct(valueMin);
  const fillRight = 100 - pct(valueMax);

  return (
    <div className="w-full">
      {/* Labels */}
      <div className="flex justify-between mb-3">
        <span className="text-xs font-mono font-semibold text-zeni-foreground bg-zinc-100 rounded px-2 py-0.5">
          KES {defaultFormat(valueMin)}
        </span>
        <span className="text-xs font-mono font-semibold text-zeni-foreground bg-zinc-100 rounded px-2 py-0.5">
          KES {formatLabel(valueMax)}
        </span>
      </div>

      {/* Track */}
      <div ref={trackRef} className="relative h-6 flex items-center">
        {/* Background rail */}
        <div className="absolute inset-x-0 h-1 rounded-full bg-zinc-200" />

        {/* Active fill */}
        <div
          className="absolute h-1 rounded-full bg-zeni-foreground transition-none"
          style={{ left: `${fillLeft}%`, right: `${fillRight}%` }}
        />

        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMin}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v < valueMax) onChangeMin(v);
          }}
          className="price-slider-thumb"
          aria-label="Minimum price"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={valueMin}
          aria-valuetext={`KES ${defaultFormat(valueMin)}`}
        />

        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueMax}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v > valueMin) onChangeMax(v);
          }}
          className="price-slider-thumb"
          aria-label="Maximum price"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={valueMax}
          aria-valuetext={`KES ${defaultFormat(valueMax)}`}
        />
      </div>

      {/* Preset chips */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {[
          { label: 'Under 30K', lo: 0, hi: 30_000 },
          { label: '30–50K', lo: 30_000, hi: 50_000 },
          { label: '50–80K', lo: 50_000, hi: 80_000 },
          { label: '80–120K', lo: 80_000, hi: 120_000 },
          { label: '120–200K', lo: 120_000, hi: 200_000 },
          { label: '200K+', lo: 200_000, hi: max },
        ].map((preset) => {
          const active = valueMin === preset.lo && valueMax === preset.hi;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                onChangeMin(preset.lo);
                onChangeMax(preset.hi);
              }}
              className={`rounded-full px-2.5 py-1 text-[10px] font-mono font-semibold border transition-colors ${
                active
                  ? 'border-black bg-black text-white'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-400'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
