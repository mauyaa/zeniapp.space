import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageGalleryProps {
  images: string[];
  alt: string;
  /** tiny 32px cloudinary thumb used as LQIP placeholder */
  lqipUrl?: (src: string) => string;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
}

export function ImageGallery({ images, alt, lqipUrl }: ImageGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});

  const total = images.length;

  const prev = useCallback(() => setActiveIdx((i) => clamp(i - 1, 0, total - 1)), [total]);
  const next = useCallback(() => setActiveIdx((i) => clamp(i + 1, 0, total - 1)), [total]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxOpen, prev, next]);

  // Trap scroll when lightbox is open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightboxOpen]);

  if (total === 0) {
    return (
      <div className="w-full aspect-[16/9] bg-zinc-100 flex items-center justify-center rounded-xl text-zinc-400 text-sm font-mono">
        No images
      </div>
    );
  }

  const mainSrc = images[activeIdx];
  const lqip = lqipUrl ? lqipUrl(mainSrc) : undefined;

  return (
    <>
      {/* Main image + nav arrows */}
      <div className="relative w-full aspect-[16/9] overflow-hidden rounded-xl bg-zinc-100 group">
        {/* LQIP blur placeholder */}
        {lqip && !loaded[activeIdx] && (
          <img
            src={lqip}
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60"
          />
        )}
        <AnimatePresence mode="wait">
          <motion.img
            key={mainSrc}
            src={mainSrc}
            alt={`${alt} — image ${activeIdx + 1} of ${total}`}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
            onLoad={() => setLoaded((prev) => ({ ...prev, [activeIdx]: true }))}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        </AnimatePresence>

        {/* Nav arrows — shown only if multiple images */}
        {total > 1 && (
          <>
            <button
              onClick={prev}
              disabled={activeIdx === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm border border-zinc-200 rounded-full p-2 shadow opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-800" />
            </button>
            <button
              onClick={next}
              disabled={activeIdx === total - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm border border-zinc-200 rounded-full p-2 shadow opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4 text-zinc-800" />
            </button>
          </>
        )}

        {/* Counter badge */}
        {total > 1 && (
          <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-mono px-2.5 py-1 rounded-full">
            {activeIdx + 1} / {total}
          </span>
        )}

        {/* Open lightbox */}
        <button
          onClick={() => setLightboxOpen(true)}
          className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm border border-zinc-200 rounded-full p-2 shadow opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          aria-label="View full-screen"
        >
          <ZoomIn className="w-4 h-4 text-zinc-800" />
        </button>
      </div>

      {/* Thumbnail strip */}
      {total > 1 && (
        <div
          className="flex gap-2 mt-3 overflow-x-auto pb-1 snap-x"
          role="list"
          aria-label="Image thumbnails"
        >
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setActiveIdx(i)}
              className={`flex-shrink-0 w-16 h-14 rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 snap-start ${
                i === activeIdx
                  ? 'border-emerald-500 ring-2 ring-emerald-200'
                  : 'border-transparent opacity-60 hover:opacity-80'
              }`}
              aria-label={`View image ${i + 1}`}
              aria-current={i === activeIdx ? 'true' : undefined}
            >
              <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Full-screen Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Image lightbox"
            onClick={(e) => {
              if (e.target === e.currentTarget) setLightboxOpen(false);
            }}
          >
            {/* Close */}
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              aria-label="Close lightbox (Escape)"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Counter */}
            <span className="absolute top-5 left-1/2 -translate-x-1/2 text-white/60 text-xs font-mono">
              {activeIdx + 1} / {total}
            </span>

            {/* Main lightbox image */}
            <div className="relative w-full max-w-5xl px-16 flex items-center justify-center">
              {total > 1 && (
                <button
                  onClick={prev}
                  disabled={activeIdx === 0}
                  className="absolute left-2 text-white/70 hover:text-white disabled:opacity-30 p-3 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>
              )}
              <AnimatePresence mode="wait">
                <motion.img
                  key={`lb-${activeIdx}`}
                  src={images[activeIdx]}
                  alt={`${alt} — image ${activeIdx + 1} of ${total}`}
                  className="max-h-[80vh] max-w-full object-contain rounded-xl"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                />
              </AnimatePresence>
              {total > 1 && (
                <button
                  onClick={next}
                  disabled={activeIdx === total - 1}
                  className="absolute right-2 text-white/70 hover:text-white disabled:opacity-30 p-3 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-7 h-7" />
                </button>
              )}
            </div>

            {/* Lightbox thumb strip */}
            {total > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2 px-4 max-w-2xl">
                {images.map((src, i) => (
                  <button
                    key={src}
                    onClick={() => setActiveIdx(i)}
                    className={`flex-shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 transition-all focus:outline-none ${
                      i === activeIdx
                        ? 'border-emerald-400 opacity-100'
                        : 'border-transparent opacity-40 hover:opacity-70'
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
