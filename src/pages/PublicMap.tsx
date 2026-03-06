import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PropertyMap } from '../components/PropertyMap';
import { Map as MapIcon, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { searchListings } from '../lib/api/listings';
import { normalizeKenyaLatLng } from '../utils/geo';
import type { Property } from '../utils/mockData';
import { listingThumbUrl } from '../lib/cloudinary';
import { resolveApiAssetUrl } from '../lib/runtime';

const fallbackImage =
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=60';

type PropertyWithMeta = Property & {
  saved?: boolean;
};

/**
 * Races a promise against a timeout.
 * If timeout wins, returns the fallback value.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

export function PublicMapPage() {
  const navigate = useNavigate();
  const { isAuthed, user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapProps, setMapProps] = useState<PropertyWithMeta[]>([]);

  useEffect(() => {
    let cancelled = false;

    const searchPromise = searchListings({ limit: 50, verifiedOnly: true, noCache: true });

    withTimeout(searchPromise, 5000, { items: [], total: 0 })
      .then((res) => {
        if (cancelled) return;
        const raw = res?.items || [];
        const converted: PropertyWithMeta[] = raw.map((listing) => {
          const [lat, lng] = normalizeKenyaLatLng(
            listing.location?.lat ?? listing.location?.coordinates?.[1],
            listing.location?.lng ?? listing.location?.coordinates?.[0]
          );

          const rawImg = listing.imageUrl || listing.images?.[0]?.url || listing.agent?.image;
          const resolvedImg = resolveApiAssetUrl(rawImg);
          const image = listingThumbUrl(resolvedImg) || fallbackImage;

          return {
            id: listing.id,
            title: listing.title,
            category: listing.category,
            description: listing.description,
            price: listing.price,
            currency: listing.currency,
            purpose: (listing.purpose as Property['purpose']) || 'rent',
            type: (listing.type as Property['type']) || 'Apartment',
            agentId: listing.agent?.id,
            location: {
              neighborhood: listing.location?.neighborhood || '',
              city: listing.location?.city || '',
              lat,
              lng,
            },
            features: {
              bedrooms: listing.beds ?? 0,
              bathrooms: listing.baths ?? 0,
              sqm: listing.sqm ?? 0,
            },
            amenities: listing.amenities,
            catalogueUrl: listing.catalogueUrl,
            isVerified: Boolean(listing.verified),
            imageUrl: image,
            images:
              listing.images && listing.images.length > 0
                ? listing.images.map((img) => ({
                    ...img,
                    url: resolveApiAssetUrl(img.url) || fallbackImage,
                  }))
                : [{ url: image }],
            agent: {
              name: listing.agent?.name || 'Agent',
              image: listingThumbUrl(resolveApiAssetUrl(listing.agent?.image)) || fallbackImage,
            },
            saved: listing.saved,
          };
        });
        setMapProps(converted);
      })
      .catch((err) => {
        console.error('Failed to load map items', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = mapProps.find((p) => p.id === selectedId);

  const handleRequireAuth = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="flex items-center justify-between px-6 h-16 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold tracking-tight">
            ZENI<span className="text-green-500">.</span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-400 hidden sm:inline-block">
            Public Map Preview
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isAuthed ? (
            <button
              onClick={() => navigate('/app/explore?view=map')}
              className="border border-slate-900 px-4 py-2 text-[11px] font-bold uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-colors"
            >
              Open full app ({user?.name || 'Account'})
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="text-[11px] font-bold uppercase tracking-widest text-slate-700 hover:text-black transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="bg-slate-900 text-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
              >
                Create account
              </button>
            </>
          )}
        </div>
      </header>

      <main className="relative h-[calc(100vh-4rem)]">
        <PropertyMap
          properties={mapProps}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
        />

        {/* Floating card prompting auth when a marker is selected */}
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center md:justify-start md:items-start p-4 z-[400]">
          <div
            className={`transition-all duration-300 ease-out ${selected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} pointer-events-auto max-w-sm w-full md:w-96`}
          >
            {selected && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between text-xs font-mono uppercase tracking-widest text-slate-500 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Login required
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-slate-400 hover:text-slate-900 font-sans text-lg leading-none"
                  >
                    &times;
                  </button>
                </div>
                <div className="p-0">
                  <img
                    src={listingThumbUrl(selected.imageUrl)}
                    alt={selected.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
                <div className="p-4 space-y-2">
                  <div className="text-sm font-semibold text-slate-900 line-clamp-1">
                    {selected.title}
                  </div>
                  <div className="text-xs text-slate-500">{selected.location.city || 'Kenya'}</div>
                  <div className="text-sm font-mono text-slate-800 font-bold">
                    {selected.currency} {selected.price.toLocaleString()}
                  </div>
                  <div className="flex gap-2 pt-3">
                    <button
                      onClick={handleRequireAuth}
                      className="flex-1 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
                    >
                      Login
                    </button>
                    <button
                      onClick={() => navigate('/register')}
                      className="flex-1 border border-slate-300 px-4 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest hover:border-slate-900 hover:bg-slate-50 transition-colors"
                    >
                      Create account
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center mt-2 uppercase tracking-wide">
                    Join to see full photos and details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 z-[400] inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest shadow-md border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <MapIcon className="h-4 w-4" /> Back
        </button>
      </main>
    </div>
  );
}
