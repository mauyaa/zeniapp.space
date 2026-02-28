import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DrawerImageGalleryProps {
  images: string[];
  title: string;
  currentImage: number;
  isLoading: boolean;
  onImageLoad: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelect: (index: number) => void;
}

export const DrawerImageGallery = React.memo(function DrawerImageGallery({
  images,
  title,
  currentImage,
  isLoading,
  onImageLoad,
  onNext,
  onPrev,
  onSelect,
}: DrawerImageGalleryProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: reduceMotion ? 0 : 0.15, duration: reduceMotion ? 0 : 0.2 }}
      className="relative overflow-hidden rounded-2xl border border-[#E9E2D8]"
    >
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 z-10 animate-pulse bg-amber-100/80" />
      )}

      <img
        src={images[currentImage]}
        alt={`${title} - Image ${currentImage + 1}`}
        className="h-60 w-full object-cover transition-opacity duration-300"
        onLoad={onImageLoad}
      />

      {/* Image navigation */}
      {images.length > 1 && (
        <>
          <button
            onClick={onPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-[#FFFBF7]/90 p-2 shadow-md backdrop-blur transition hover:bg-[#FFFBF7]"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-4 w-4 text-slate-700" />
          </button>
          <button
            onClick={onNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#FFFBF7]/90 p-2 shadow-md backdrop-blur transition hover:bg-[#FFFBF7]"
            aria-label="Next image"
          >
            <ChevronRight className="h-4 w-4 text-slate-700" />
          </button>
          {/* Dots indicator */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_: string, idx: number) => (
              <button
                key={idx}
                onClick={() => onSelect(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentImage
                    ? 'w-4 bg-white'
                    : 'w-2 bg-white/60 hover:bg-white/80'
                }`}
                aria-label={`View image ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Image counter */}
      <div className="absolute right-3 top-3 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
        {currentImage + 1}/{images.length}
      </div>
    </motion.div>
  );
});
