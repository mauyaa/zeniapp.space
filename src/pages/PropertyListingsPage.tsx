import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Map as MapIcon, List } from 'lucide-react';
import { PropertyMap } from '../components/PropertyMap';
import { PropertyCard } from '../components/PropertyCard';
import { SearchBar } from '../components/SearchBar';
import { properties } from '../utils/mockData';
import { useAuth } from '../context/AuthProvider';
export function PropertyListingsPage() {
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false); // For mobile toggle
  const [searchTerm, setSearchTerm] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [filteredProperties, setFilteredProperties] = useState(properties);

  // Keep filtered list in sync with search/filter state
  useEffect(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = properties.filter((p) => {
      const matchesSearch =
        !normalizedSearch ||
        p.location.neighborhood.toLowerCase().includes(normalizedSearch) ||
        p.location.city.toLowerCase().includes(normalizedSearch) ||
        p.title.toLowerCase().includes(normalizedSearch);
      const matchesVerification = !verifiedOnly || p.isVerified;
      return matchesSearch && matchesVerification;
    });
    setFilteredProperties(filtered);
  }, [searchTerm, verifiedOnly]);

  // Scroll to selected card
  useEffect(() => {
    if (selectedId) {
      const element = document.getElementById(`card-${selectedId}`);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
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

  // Limit dataset for guests; full list for authenticated users
  const displayProperties = useMemo(
    () => (isAuthed ? filteredProperties : filteredProperties.slice(0, 6)),
    [filteredProperties, isAuthed]
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 overflow-hidden">
      {/* Header / Nav */}
      <header className="bg-white border-b border-gray-200 z-20 flex-shrink-0">
        <div className="max-w-[1920px] mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              ZENI<span className="text-green-500">.</span>
            </span>
          </Link>

          {isAuthed ? (
            <div className="flex items-center gap-4">
              <button className="text-sm font-medium text-gray-600 hover:text-gray-900">
                For Rent
              </button>
              <button className="text-sm font-medium text-gray-600 hover:text-gray-900">
                For Sale
              </button>
              <div className="h-4 w-px bg-gray-300 mx-2" />
              <button
                onClick={() => navigate('/agentlogin')}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                List Property
              </button>
              <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                  alt="User" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-bold uppercase tracking-widest text-gray-700 hover:text-black"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-gray-800"
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
          absolute inset-0 z-0 md:relative md:w-[45%] lg:w-[50%] xl:w-[55%]
          transition-all duration-300 ease-in-out
          ${isMapOpen ? 'z-30' : 'z-0 md:z-auto'}
        `}>

          <PropertyMap
            properties={displayProperties}
            selectedId={selectedId}
            onSelect={setSelectedId} />


          {/* Floating Search Bar */}
          <div className="absolute top-4 left-4 right-4 md:left-8 md:right-auto md:w-96 z-[1000]">
            <SearchBar onSearch={handleSearch} onFilter={(_filters) => handleFilter()} />
          </div>

          {/* Mobile Map Toggle */}
          <button
            onClick={() => setIsMapOpen(!isMapOpen)}
            className="md:hidden absolute bottom-6 right-4 z-[1000] bg-gray-900 text-white px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 font-medium">

            {isMapOpen ?
              <List className="w-4 h-4" /> :

              <MapIcon className="w-4 h-4" />
            }
            {isMapOpen ? 'Show List' : 'Show Map'}
          </button>
        </div>

        {/* Listings Container - Right Side (Desktop) / Bottom (Mobile) */}
        <div
          className={`
          absolute inset-0 bg-gray-50 md:relative md:w-[55%] lg:w-[50%] xl:w-[45%]
          overflow-y-auto scroll-smooth
          ${isMapOpen ? 'hidden md:block' : 'block'}
        `}>

          <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
            <div className="mb-6 flex items-baseline justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Properties in Kenya
                </h1>
                <p className="text-gray-500 text-sm">
                  {displayProperties.length} listings found {isAuthed ? '' : '(preview)'}
                </p>
              </div>

              <select className="text-sm border-gray-200 rounded-lg text-gray-600 focus:ring-emerald-500 focus:border-emerald-500 bg-white shadow-sm">
                <option>Sort by: Recommended</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Newest First</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {displayProperties.map((property, index) =>
                <motion.div
                  key={property.id}
                  id={`card-${property.id}`}
                  initial={{
                    opacity: 0,
                    y: 20
                  }}
                  animate={{
                    opacity: 1,
                    y: 0
                  }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05
                  }}>

                  <PropertyCard
                    property={property}
                    isSelected={selectedId === property.id}
                    onClick={() => setSelectedId(property.id)} />

                </motion.div>
              )}
            </div>

            {displayProperties.length === 0 &&
              <div className="text-center py-20">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  No properties found
                </h3>
                <p className="text-gray-500 mt-1">
                  Try adjusting your search or filters
                </p>
              </div>
            }

            {!isAuthed && (
              <div className="mt-10 rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Unlock full map & listings</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Create an account or log in to view all properties, save listings, and use advanced filters.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => navigate('/register')}
                    className="bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-gray-800"
                  >
                    Create account
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="border border-black px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                  >
                    Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>);

}
