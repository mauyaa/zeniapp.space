import { useEffect } from 'react';

/**
 * Set document.title for the current page. Restores previous title on unmount.
 */
export function useDocumentTitle(title: string, options?: { skipSuffix?: boolean }) {
  const fullTitle = options?.skipSuffix ? title : title ? `${title} — Zeni` : 'Zeni — Where Kenya Lives';

  useEffect(() => {
    const previous = document.title;
    document.title = fullTitle;
    return () => {
      document.title = previous;
    };
  }, [fullTitle]);
}
