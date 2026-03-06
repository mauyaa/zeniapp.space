import { useEffect } from 'react';

type ListingSEO = {
  id: string;
  title: string;
  price: number;
  currency: string;
  imageUrl?: string | null;
  location?: { city?: string; neighborhood?: string };
  purpose?: string;
};

function setOrCreate(selector: string, attr: string, value: string) {
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    const [attrKey, attrVal] = attr.split('=');
    el.setAttribute(attrKey, attrVal);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

/**
 * Set document title, Open Graph, Twitter Card meta, and JSON-LD structured data for a listing.
 */
export function useListingSEO(listing: ListingSEO | null) {
  useEffect(() => {
    if (!listing) return;

    const locationLabel =
      [listing.location?.neighborhood, listing.location?.city].filter(Boolean).join(', ') ||
      'Kenya';
    const priceLabel = listing.purpose === 'buy' ? 'For sale' : 'For rent';
    const title = `${listing.title} — Zeni`;
    const description = `${priceLabel} · ${listing.currency} ${listing.price.toLocaleString()} · ${locationLabel}`;
    const imageUrl = listing.imageUrl?.trim() || undefined;
    const url = typeof window !== 'undefined' ? window.location.href : '';

    document.title = 'Zeni — Where Kenya Lives';

    // Open Graph
    setOrCreate('meta[property="og:title"]', 'property=og:title', title);
    setOrCreate('meta[property="og:description"]', 'property=og:description', description);
    setOrCreate('meta[property="og:type"]', 'property=og:type', 'website');
    setOrCreate('meta[property="og:url"]', 'property=og:url', url);
    if (imageUrl) setOrCreate('meta[property="og:image"]', 'property=og:image', imageUrl);

    // Twitter Card (important for WhatsApp link previews too)
    setOrCreate('meta[name="twitter:card"]', 'name=twitter:card', 'summary_large_image');
    setOrCreate('meta[name="twitter:title"]', 'name=twitter:title', title);
    setOrCreate('meta[name="twitter:description"]', 'name=twitter:description', description);
    if (imageUrl) setOrCreate('meta[name="twitter:image"]', 'name=twitter:image', imageUrl);

    // meta description (for Google snippet)
    setOrCreate('meta[name="description"]', 'name=description', description);

    // JSON-LD structured data (RealEstateListing)
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'RealEstateListing',
      name: listing.title,
      description,
      url,
      image: imageUrl,
      offers: {
        '@type': 'Offer',
        price: listing.price,
        priceCurrency: listing.currency || 'KES',
        availability: 'https://schema.org/InStock',
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: listing.location?.neighborhood || listing.location?.city || 'Kenya',
        addressCountry: 'KE',
      },
    };

    let scriptEl = document.getElementById('listing-jsonld') as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'listing-jsonld';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(jsonLd);

    return () => {
      document.title = 'Zeni — Where Kenya Lives';
      document.getElementById('listing-jsonld')?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    listing?.id,
    listing?.title,
    listing?.price,
    listing?.currency,
    listing?.imageUrl,
    listing?.location?.city,
    listing?.location?.neighborhood,
    listing?.purpose,
  ]);
}
