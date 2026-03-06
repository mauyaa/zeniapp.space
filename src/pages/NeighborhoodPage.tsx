import React, { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { MapPin, BedDouble, ShieldCheck, ChevronRight, ArrowLeft } from 'lucide-react';
import { searchListings, type ListingCard } from '../lib/api';
import { listingThumbUrl } from '../lib/cloudinary';
import { resolveApiAssetUrl } from '../lib/runtime';
import { properties as mockProperties } from '../utils/mockData';

/**
 * Races a promise against a timeout.
 * If timeout wins, returns the fallback value.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

const NEIGHBORHOODS: Record<
  string,
  { title: string; description: string; faqs: { q: string; a: string }[] }
> = {
  kilimani: {
    title: 'Kilimani',
    description:
      "One of Kenya's most sought-after residential neighbourhoods, Kilimani blends modern apartments with tree-lined streets. Excellent access to Hurlingham, Valley Road, and the CBD makes it a favourite for young professionals. Expect high-quality finishes, gyms, pools, and service charge clarity.",
    faqs: [
      {
        q: 'What is the average rent in Kilimani?',
        a: 'Studios start at KES 25K; 1-bed from KES 35K; 2-bed KES 55K–120K depending on finish and amenities.',
      },
      {
        q: 'Is Kilimani safe?',
        a: "Yes — Kilimani is considered one of Kenya's safer neighbourhoods with active neighbourhood watch schemes.",
      },
      {
        q: 'Are pets allowed?',
        a: 'Many managed properties allow pets; confirm with the agent before listing.',
      },
    ],
  },
  westlands: {
    title: 'Westlands',
    description:
      "Westlands is Kenya's most vibrant commercial-residential blend — think high-rise apartments, rooftop bars, and walkable amenities. Ideal for expats and professionals who want to be in the middle of everything.",
    faqs: [
      {
        q: 'Is Westlands good for expats?',
        a: 'Very popular with expats — proximity to Westgate, ABC Place, and major employers makes it a top pick.',
      },
      {
        q: 'What is the average rent?',
        a: '1-bed from KES 45K; 2-bed from KES 75K for a modern apartment.',
      },
      {
        q: 'How is the traffic from Westlands?',
        a: 'Matatus and Ubers are plentiful; off-peak commute to CBD is under 20 minutes.',
      },
    ],
  },
  karen: {
    title: 'Karen',
    description:
      'Named after Karen Blixen, this leafy suburb has spacious gardens, equestrian estates, and a tranquil pace. Best for families who prioritise space over proximity. Confirm water and power backup — most properties rely on boreholes.',
    faqs: [
      {
        q: 'Is Karen far from the CBD?',
        a: 'Yes, about 18km — roughly 30–45 mins depending on traffic. Best suited for those working in Ngong Rd corridor or from home.',
      },
      {
        q: 'What are typical rents in Karen?',
        a: '3-bed houses from KES 120K; townhouses in gated estates from KES 80K.',
      },
      {
        q: 'Is there piped water in Karen?',
        a: 'Most properties rely on boreholes and tanks. Always ask the agent about water reliability.',
      },
    ],
  },
  lavington: {
    title: 'Lavington',
    description:
      'A quieter alternative to Kilimani, Lavington attracts families and professionals who want space without sacrificing city access. The area has good schools, clean roads, and a mix of stand-alones and serviced apartments.',
    faqs: [
      {
        q: 'How does Lavington compare to Kilimani?',
        a: 'Lavington is quieter and more residential; slightly less nightlife but better for families.',
      },
      { q: 'What are average rents?', a: '2-bed apartments from KES 55K; houses from KES 90K.' },
    ],
  },
  runda: {
    title: 'Runda',
    description:
      "Runda is one of Kenya's most prestigious gated communities, featuring large homes with private gardens, 24/7 security, and embassy-level privacy. Popular with senior executives and diplomats.",
    faqs: [
      {
        q: 'Can I rent in Runda?',
        a: 'Yes — most properties are 4–6-bed houses from KES 200K upwards.',
      },
      {
        q: 'Is Runda near the CBD?',
        a: 'About 22km — a 35–50 min drive. Mostly suitable for those working in Muthaiga or Gigiri.',
      },
    ],
  },
  parklands: {
    title: 'Parklands',
    description:
      'Parklands is a family-friendly, diverse suburb with excellent schools, mosques, and temples. Close to the Aga Khan Hospital and City Park. Great value for money compared to Westlands.',
    faqs: [
      {
        q: 'Is Parklands good for families?',
        a: 'Very — excellent schools, parks, and a close-knit community make it ideal for families.',
      },
      { q: 'What are typical rents?', a: '2-bed apartments from KES 40K; houses from KES 70K.' },
    ],
  },
};

function formatCompact(price: number, currency: string, purpose?: string) {
  const sym = currency?.includes('KES') ? 'KES' : currency || 'KES';
  const unit = purpose === 'rent' ? '/mo' : '';
  if (price >= 1_000_000) return `${sym} ${(price / 1_000_000).toFixed(1)}M${unit}`;
  if (price >= 1_000) return `${sym} ${(price / 1_000).toFixed(0)}K${unit}`;
  return `${sym} ${price.toLocaleString()}${unit}`;
}

export function NeighborhoodPage() {
  const { neighborhood, purpose } = useParams<{ neighborhood: string; purpose: 'rent' | 'buy' }>();
  const navigate = useNavigate();
  const [listings, setListings] = React.useState<ListingCard[]>([]);
  const [loading, setLoading] = React.useState(true);

  const key = (neighborhood || '').toLowerCase();
  const data = NEIGHBORHOODS[key];
  const purposeLabel = purpose === 'buy' ? 'Buy' : 'Rent';

  const fallbackFromMock = React.useCallback((): ListingCard[] => {
    const keyLower = (neighborhood || '').toLowerCase();
    return mockProperties
      .filter((p) => p.location.neighborhood.toLowerCase().includes(keyLower))
      .filter((p) => !purpose || p.purpose === purpose)
      .map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price,
        currency: p.currency,
        purpose: p.purpose,
        type: p.type,
        beds: p.features?.bedrooms,
        baths: p.features?.bathrooms,
        location: {
          neighborhood: p.location.neighborhood,
          city: p.location.city,
          lat: p.location.lat,
          lng: p.location.lng,
        },
        verified: p.isVerified,
        imageUrl: p.imageUrl,
      }));
  }, [neighborhood, purpose]);

  useEffect(() => {
    document.title = `${purposeLabel} in ${data?.title || neighborhood} - Zeni`;
    const desc = `Browse ${purpose === 'buy' ? 'properties for sale' : 'rentals'} in ${data?.title || neighborhood}, Kenya. Verified listings updated daily.`;
    let el = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', 'description');
      document.head.appendChild(el);
    }
    el.setAttribute('content', desc);
    return () => {
      document.title = 'Zeni — Where Kenya Lives';
    };
  }, [data?.title, neighborhood, purpose, purposeLabel]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const searchPromise = searchListings({ q: neighborhood, purpose, limit: 12 });

    withTimeout(searchPromise, 5000, { items: [], total: 0 })
      .then((res) => {
        if (cancelled) return;
        if (res?.items && res.items.length > 0) {
          setListings(res.items);
        } else {
          setListings(fallbackFromMock());
        }
      })
      .catch(() => {
        if (!cancelled) {
          setListings(fallbackFromMock());
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [neighborhood, purpose, fallbackFromMock]);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 text-center">
        <p className="text-zinc-600">
          We don't have a guide for <strong>{neighborhood}</strong> yet.
        </p>
        <Link to="/explore" className="text-sm text-emerald-600 underline">
          Browse all listings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-2 text-xs font-mono text-zinc-400"
        aria-label="Breadcrumb"
      >
        <Link to="/explore" className="hover:text-zinc-700 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Search
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-zinc-600">{data.title}</span>
      </nav>

      {/* Hero */}
      <header>
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest rounded-md ${purpose === 'buy' ? 'bg-zinc-900 text-white' : 'bg-emerald-600 text-white'}`}
          >
            For {purposeLabel}
          </span>
          <span className="flex items-center gap-1 text-xs font-mono text-zinc-500">
            <MapPin className="w-3.5 h-3.5" /> {data.title}, Kenya
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-serif font-semibold text-zinc-900 mb-4">
          {purpose === 'buy' ? 'Buy property' : 'Rent'} in {data.title}
        </h1>
        <p className="text-zinc-600 leading-relaxed max-w-2xl">{data.description}</p>
      </header>

      {/* Listings grid */}
      <section>
        <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-400 mb-4">
          {loading ? 'Loading listings…' : `${listings.length} listings in ${data.title}`}
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-zinc-100 animate-pulse aspect-[4/3]" />
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {listings.map((l) => (
              <Link
                key={l.id}
                to={`/listing/${l.id}`}
                className="group block rounded-xl overflow-hidden border border-zinc-200 bg-white hover:border-emerald-400 hover:shadow-md transition-all"
              >
                <div className="aspect-[4/3] bg-zinc-100 overflow-hidden">
                  <img
                    src={listingThumbUrl(resolveApiAssetUrl(l.imageUrl), 400)}
                    alt={l.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-zinc-800 line-clamp-1">{l.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-mono text-zinc-500 flex items-center gap-1">
                      <BedDouble className="w-3 h-3" />
                      {l.beds ?? '?'} bed
                    </span>
                    <span className="text-xs font-mono font-semibold text-zinc-800">
                      {formatCompact(l.price, l.currency || 'KES', l.purpose)}
                    </span>
                  </div>
                  {l.verified && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 mt-1">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-zinc-400 text-sm font-mono">
            No listings found right now—check back soon or{' '}
            <Link to="/explore" className="text-emerald-600 underline">
              browse all
            </Link>
            .
          </div>
        )}
        {listings.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate(`/explore?q=${neighborhood}&purpose=${purpose}`)}
              className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-colors"
            >
              See all listings in {data.title} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>

      {/* FAQs */}
      {data.faqs.length > 0 && (
        <section className="border-t border-zinc-200 pt-8">
          <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-500 mb-5">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {data.faqs.map((faq, i) => (
              <div key={i} className="bg-zinc-50 rounded-xl p-5">
                <p className="font-semibold text-zinc-900 mb-2 text-sm">{faq.q}</p>
                <p className="text-sm text-zinc-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Schema JSON-LD for neighborhood page */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: `${purposeLabel} in ${data.title} — Zeni`,
            description: `Browse ${purpose === 'buy' ? 'properties for sale' : 'rentals'} in ${data.title}, Kenya.`,
            url: typeof window !== 'undefined' ? window.location.href : '',
          }),
        }}
      />
    </div>
  );
}

export default NeighborhoodPage;
