import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Enhanced Image component with IntersectionObserver lazy loading,
 * responsive srcSet support, and error/retry handling.
 */

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  lazy?: boolean;
  blurHash?: string;
  aspectRatio?: string;
  skeleton?: boolean;
  /** Provide width/height to prevent CLS (Cumulative Layout Shift) */
  width?: number;
  height?: number;
  /** Responsive srcSet for different screen widths */
  srcSet?: string;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function Image({
  src,
  alt,
  lazy = true,
  blurHash,
  aspectRatio = '16/9',
  skeleton = true,
  className = '',
  width,
  height,
  srcSet,
  sizes,
  onLoad,
  onError,
  ...props
}: ImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver-based lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Start loading 200px before entering viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [lazy, isInView]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    if (imgRef.current) {
      // Bust cache on retry
      imgRef.current.src = `${src}${src.includes('?') ? '&' : '?'}retry=${Date.now()}`;
    }
  }, [src]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        aspectRatio,
        ...(width && height ? { width, height } : {}),
      }}
    >
      {/* Loading skeleton */}
      <AnimatePresence>
        {skeleton && isLoading && !hasError && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse"
          />
        )}
      </AnimatePresence>

      {/* BlurHash placeholder */}
      {blurHash && isLoading && (
        <div
          className="absolute inset-0 bg-slate-200 dark:bg-slate-800"
          style={{
            backgroundImage: `url(${blurHash})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Image — only render src when in viewport */}
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          srcSet={srcSet}
          sizes={sizes}
          width={width}
          height={height}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}

      {/* Error fallback */}
      <AnimatePresence>
        {hasError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 p-4 text-center"
          >
            <div className="text-slate-400 dark:text-slate-600 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21.75 17.25v-12a3 3 0 0 0-3-3h-13.5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3Zm-16.5-9a1.5 1.5 0 0 1 1.5-1.5h9a1.5 1.5 0 0 1 0 3h-9a1.5 1.5 0 0 1-1.5-1.5Zm0 4.5a1.5 1.5 0 0 1 1.5-1.5h6a1.5 1.5 0 0 1 0 3h-6a1.5 1.5 0 0 1-1.5-1.5Z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Failed to load image</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Retry button on error */}
      {hasError && (
        <button
          onClick={handleRetry}
          className="absolute bottom-2 right-2 px-2 py-1 bg-slate-800 text-white text-xs rounded hover:bg-slate-700 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Image gallery with optimized loading
 */
interface ImageGalleryProps {
  images: string[];
  title: string;
  onImageClick?: (index: number) => void;
  className?: string;
}

export function ImageGallery({ images, title, onImageClick, className = '' }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className={`bg-slate-200 dark:bg-slate-800 rounded-2xl ${className}`}>
        <Image
          src="https://placehold.co/600x400/EEE/31343C?text=No+Images"
          alt="No images available"
          className="w-full h-full rounded-2xl"
          skeleton={false}
        />
      </div>
    );
  }

  const currentImage = images[currentIndex] || images[0];

  return (
    <div className={`relative group ${className}`}>
      {/* Main image */}
      <div className="relative rounded-2xl overflow-hidden">
        <Image
          src={currentImage}
          alt={`${title} - Image ${currentIndex + 1}`}
          className="w-full h-full"
          onClick={() => onImageClick?.(currentIndex)}
        />

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
            {currentIndex + 1}/{images.length}
          </div>
        )}
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
            aria-label="Previous image"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % images.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 backdrop-blur-sm text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
            aria-label="Next image"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Thumbnail dots */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1 mt-3">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-emerald-500 w-4' : 'bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`View image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Progressive image loader with low-quality placeholder
 */
interface ProgressiveImageProps {
  highQualitySrc: string;
  lowQualitySrc: string;
  alt: string;
  className?: string;
}

export function ProgressiveImage({
  highQualitySrc,
  lowQualitySrc,
  alt,
  className = '',
}: ProgressiveImageProps) {
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {/* Low quality placeholder */}
      <Image
        src={lowQualitySrc}
        alt={alt}
        className={`absolute inset-0 transition-opacity duration-500 ${
          isHighQualityLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        skeleton={false}
      />

      {/* High quality image */}
      <Image
        src={highQualitySrc}
        alt={alt}
        className={`transition-opacity duration-500 ${
          isHighQualityLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setIsHighQualityLoaded(true)}
        skeleton={false}
      />
    </div>
  );
}
