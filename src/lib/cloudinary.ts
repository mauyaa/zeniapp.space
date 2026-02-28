/**
 * Cloudinary URL transforms for mobile-friendly images (save data in Kenya).
 * Uses dynamic transformations: f_auto (WebP/AVIF), q_auto, and width for responsive loading.
 */

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'limit' | 'pad';
  quality?: 'auto' | 'auto:good' | 'auto:eco' | 'auto:low' | number;
  format?: 'auto' | 'webp' | 'jpg' | 'png';
}

/**
 * If the URL is a Cloudinary URL, return a transformed version (WebP/auto quality, optional width).
 * Otherwise return the original URL.
 */
export function cloudinaryUrl(
  url: string | undefined | null,
  options: CloudinaryTransformOptions = {}
): string {
  if (!url || !url.trim()) return '';
  if (!url.includes('res.cloudinary.com') && !url.includes('cloudinary.com')) return url;

  const { width, height, crop = 'fill', quality = 'auto', format = 'auto' } = options;
  const parts: string[] = [];
  if (format) parts.push(`f_${format}`);
  if (quality) parts.push(`q_${quality}`);
  if (width) parts.push(`w_${width}`);
  if (height) parts.push(`h_${height}`);
  parts.push(`c_${crop}`);

  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('cloudinary.com') && parsed.pathname.includes('/upload/')) {
      const pathParts = parsed.pathname.split('/upload/');
      if (pathParts.length === 2) {
        const prefix = pathParts[0];
        const rest = pathParts[1];
        const transformSegment = parts.length ? parts.join(',') + '/' : '';
        return `${parsed.origin}${prefix}/upload/${transformSegment}${rest}`;
      }
    }
  } catch {
    // not a valid URL
  }
  return url;
}

/** Thumbnail for cards (e.g. 400px wide, auto format/quality). */
export function listingThumbUrl(url: string | undefined | null, width = 400): string {
  return cloudinaryUrl(url, { width, crop: 'fill', quality: 'auto', format: 'auto' });
}

/** Detail/gallery image (e.g. 800px, auto format). */
export function listingDetailUrl(url: string | undefined | null, width = 800): string {
  return cloudinaryUrl(url, { width, crop: 'limit', quality: 'auto', format: 'auto' });
}

/** Tiny LQIP placeholder — 32px wide, very low quality. Used as blur background before full image loads. */
export function listingLqipUrl(url: string | undefined | null): string {
  return cloudinaryUrl(url, { width: 32, crop: 'fill', quality: 10, format: 'webp' });
}
