import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Map as MapIcon, List } from 'lucide-react';
import { PropertyMap } from '../components/PropertyMap';
import { PropertyCard } from '../components/PropertyCard';
import { SearchBar } from '../components/SearchBar';
import { useAuth } from '../context/AuthProvider';
import { searchListings, type ListingCard } from '../lib/api/listings';
import { normalizeKenyaLatLng } from '../utils/geo';
import { properties as FALLBACK_PROPERTIES, type Property } from '../utils/mockData';
import { getPublicSocket, disconnectPublicSocket } from '../lib/publicSocket';
import { resolveApiAssetUrl } from '../lib/runtime';
import { listingThumbUrl } from '../lib/cloudinary';

const fallbackImage =
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=60';

const PUBLIC_FEED_KEY =
  (import.meta.env.VITE_PUBLIC_FEED_KEY as string | undefined) || 'public-demo-key';

function listingToProperty(listing: ListingCard): Property {
  const [lat, lng] = normalizeKenyaLatLng(
    listing.location?.lat ?? listing.location?.coordinates?.[1],
    listing.location?.lng ?? listing.location?.coordinates?.[0]
  );

  const rawImage = listing.imageUrl || listing.images?.[0]?.url || listing.agent?.image;
  const resolvedImage = resolveApiAssetUrl(rawImage);
  const image = listingThumbUrl(resolvedImage) || fallbackImage;

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
  };
}

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

export function PropertyListingsPage() {
  const navigate = useNavigate();
  const { isAuthed, user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false); // For mobile toggle
  const [searchTerm, setSearchTerm] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [listings, setListings] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const searchPromise = searchListings({
      q: searchTerm,
      verifiedOnly: verifiedOnly || undefined,
      limit: isAuthed ? 50 : 6,
      availabilityOnly: true,
      noCache: true,
    });

    // 5 second timeout for production resilience
    withTimeout(searchPromise, 5000, { items: [], total: 0 })
      .then((res) => {
        if (cancelled) return;
        const converted = (res?.items || []).map(listingToProperty);
        if (converted.length) {
          setListings(converted);
        } else if (!searchTerm && !verifiedOnly) {
          // If search is empty and verification is not filtered, fall back to mock data
          setListings(FALLBACK_PROPERTIES.slice(0, isAuthed ? 50 : 6));
        } else {
          setListings([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load listings', err);
        if (cancelled) return;
        // Fall back to mock data on total failure
        if (!searchTerm && !verifiedOnly) {
          setListings(FALLBACK_PROPERTIES.slice(0, isAuthed ? 50 : 6));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchTerm, verifiedOnly, isAuthed, refreshTrigger]);

  // Socket updates
  useEffect(() => {
    const socket = getPublicSocket(PUBLIC_FEED_KEY);
    const handleUpdate = () => {
      setRefreshTrigger((prev) => prev + 1);
    };

    socket.on('listing:changed', handleUpdate);
    socket.on('listing:deleted', handleUpdate);

    return () => {
      socket.off('listing:changed', handleUpdate);
      socket.off('listing:deleted', handleUpdate);
      disconnectPublicSocket();
    };
  }, []);

  // Scroll to selected card
  useEffect(() => {
    if (selectedId) {
      const element = document.getElementById(`card-${selectedId}`);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [selectedId]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleFilter = () => {
    setVerifiedOnly((prev) => !prev);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 overflow-hidden">
      {/* Header / Nav */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200 z-20 flex-shrink-0">
        <div className="max-w-[1920px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="text-2xl font-serif font-bold tracking-tight leading-none cursor-pointer">
              <Link to="/" className="hover:opacity-90 transition-opacity" aria-label="Zeni Home">
                ZENI<span className="text-[var(--zeni-green)]">.</span>
              </Link>
            </div>
            <span className="text-[10px] sm:text-[11px] font-sans font-extralight uppercase tracking-[0.25em] text-[var(--zeni-black)]/70">
              Real Estate System
            </span>
          </div>

          {isAuthed ? (
            <div className="flex items-center gap-4">
              <button className="text-xs font-mono uppercase tracking-widest text-gray-600 hover:text-gray-900 transition-colors">
                For Rent
              </button>
              <button className="text-xs font-mono uppercase tracking-widest text-gray-600 hover:text-gray-900 transition-colors">
                For Sale
              </button>
              <div className="h-4 w-px bg-gray-300 mx-2" />
              <button
                onClick={() => navigate('/agentlogin')}
                className="text-xs font-mono uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                List Property
              </button>
              <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                <img
                  src={user?.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'}
                  alt="User"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate('/login')}
                className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-gray-700 hover:text-black transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="bg-black text-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-gray-800 transition-all rounded-sm"
              >
                Create account
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content - Split Screen */}
      <main className="flex-1 flex relative overflow-hidden">
        {/* Map Container - Left Side (Desktop) / Top (Mobile) */}
        <div
          className={`
            relative w-full h-[50vh] md:h-auto md:w-[45%] lg:w-[50%] xl:w-[55%]
            transition-all duration-300 ease-in-out
            ${isMapOpen ? 'h-[70vh] z-30' : 'h-[40vh] md:h-auto'}
          `}
        >
          <PropertyMap properties={listings} selectedId={selectedId} onSelect={setSelectedId} />

          {/* Floating Search Bar */}
          <div className="absolute top-4 left-4 right-4 md:left-8 md:right-auto md:w-96 z-[1000]">
            <SearchBar onSearch={handleSearch} onFilter={handleFilter} />
          </div>

          {/* Mobile Map Toggle */}
          <button
            onClick={() => setIsMapOpen(!isMapOpen)}
            className="md:hidden absolute bottom-6 right-4 z-[1000] bg-gray-900 text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 font-medium"
          >
            {isMapOpen ? <List className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
            {isMapOpen ? 'Show List' : 'Show Map'}
          </button>
        </div>

        {/* Listings Container - Right Side (Desktop) / Bottom (Mobile) */}
        <div
          className={`
            flex-1 bg-gray-50 md:relative md:w-[55%] lg:w-[50%] xl:w-[45%]
            overflow-y-auto scroll-smooth
            ${isMapOpen ? 'hidden md:block' : 'block'}
          `}
        >
          <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
            <div className="mb-6 flex items-baseline justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Properties in Kenya</h1>
                <p className="text-gray-500 text-sm">
                  {loading ? (
                    'Searching...'
                  ) : (
                    <>
                      {listings.length} listings found {isAuthed ? '' : '(preview)'}
                    </>
                  )}
                </p>
              </div>

              <select className="text-xs font-mono uppercase tracking-widest border-gray-200 rounded-lg text-gray-600 focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-sm p-2 outline-none">
                <option>Sort by: Recommended</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Newest First</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {listings.map((property, index) => (
                <motion.div
                  key={property.id}
                  id={`card-${property.id}`}
                  initial={{
                    opacity: 0,
                    y: 20,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                  }}
                >
                  <PropertyCard
                    property={property}
                    isSelected={selectedId === property.id}
                    onClick={() => setSelectedId(property.id)}
                  />
                </motion.div>
              ))}
            </div>

            {!loading && listings.length === 0 && (
              <div className="text-center py-20">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No properties found</h3>
                <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
              </div>
            )}

            {!isAuthed && (
              <div className="mt-10 rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 font-serif">
                  Unlock full map & listings
                </h3>
                <p className="text-gray-600 text-sm mb-4 font-light">
                  Create an account or log in to view all properties, save listings, and use
                  advanced filters.
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => navigate('/register')}
                    className="bg-black text-white px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-gray-800 transition-all rounded-sm"
                  >
                    Create account
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="border border-black px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all rounded-sm"
                  >
                    Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
