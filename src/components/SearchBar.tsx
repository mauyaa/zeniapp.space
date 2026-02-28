import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, MapPin, SlidersHorizontal, X, Clock, TrendingUp, Home, Building2, Warehouse, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import Fuse from 'fuse.js';

export interface SearchBarFilters {
  priceMin?: number;
  priceMax?: number;
  beds?: number;
  baths?: number;
  propertyType?: string;
  verifiedOnly?: boolean;
}

interface SearchBarProps {
  onSearch: (term: string) => void;
  onFilter: (filters: SearchBarFilters) => void;
  placeholder?: string;
  initialFilters?: SearchBarFilters;
}

type FilterState = SearchBarFilters;

const POPULAR_LOCATIONS = [
  'Westlands, Kenya',
  'Kilimani, Kenya',
  'Karen, Kenya',
  'Lavington, Kenya',
  'Runda, Kenya',
  'Parklands, Kenya',
  'Upper Hill, Kenya',
  'CBD, Kenya'
];

const PROPERTY_TYPES = [
  { id: 'apartment', label: 'Apartment', icon: Building2 },
  { id: 'house', label: 'House', icon: Home },
  { id: 'studio', label: 'Studio', icon: Warehouse }
];

// KES-stepped price presets matching Kenya rental/buy reality
const PRICE_PRESETS = [
  { label: 'Under 30K', min: 0, max: 30000 },
  { label: '30K–50K', min: 30000, max: 50000 },
  { label: '50K–80K', min: 50000, max: 80000 },
  { label: '80K–120K', min: 80000, max: 120000 },
  { label: '120K–200K', min: 120000, max: 200000 },
  { label: '200K+', min: 200000, max: undefined }
];

const COMMUTE_HUBS = [
  'Near CBD',
  'Near Westlands',
  'Near Upper Hill',
  'Near Gigiri (UN)',
  'Near Strathmore University',
  'Near Aga Khan Hospital'
];

const MAX_RECENT_SEARCHES = 5;

export function SearchBar({ onSearch, onFilter, placeholder = 'Search location, neighborhood...', initialFilters }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>(initialFilters ?? {});
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fuzzy matcher over known Kenya locations
  const fuse = useMemo(
    () => new Fuse([...POPULAR_LOCATIONS, ...COMMUTE_HUBS], { threshold: 0.45, distance: 80 }),
    []
  );

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recent_searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((term: string) => {
    if (!term.trim()) return;
    
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== term.toLowerCase());
      const updated = [term, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem('recent_searches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem('recent_searches');
  }, []);

  // Handle search submission
  const handleSearch = useCallback((term: string) => {
    saveRecentSearch(term);
    onSearch(term);
    setIsFocused(false);
    inputRef.current?.blur();
  }, [onSearch, saveRecentSearch]);

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      handleSearch(query);
    }
    if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  }, [query, handleSearch]);

  // Fuzzy-matched suggestions (typo-tolerant)
  const filteredSuggestions = useMemo(() => {
    if (!query.trim()) return [];
    const exactMatches = [...POPULAR_LOCATIONS, ...COMMUTE_HUBS].filter((s) =>
      s.toLowerCase().includes(query.toLowerCase())
    );
    if (exactMatches.length >= 3) return exactMatches.slice(0, 6);
    // Fall back to fuzzy
    const fuzzy = fuse.search(query).map((r) => r.item);
    const merged = Array.from(new Set([...exactMatches, ...fuzzy]));
    return merged.slice(0, 6);
  }, [query, fuse]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Active filters count
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      {/* Main Search Bar */}
      <div
        className={clsx(
          'relative flex items-center bg-white rounded-2xl shadow-lg border-2 transition-all duration-200',
          isFocused 
            ? 'border-emerald-500 ring-4 ring-emerald-100' 
            : 'border-transparent hover:border-slate-200'
        )}
      >
        {/* Search Icon */}
        <div className="pl-4 text-slate-400">
          <Search className="w-5 h-5" />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search properties"
          aria-expanded={isFocused}
          aria-haspopup="listbox"
          className="flex-1 px-3 py-4 bg-transparent border-none focus:ring-0 text-slate-900 placeholder-slate-400 text-sm font-medium"
        />

        {/* Clear button */}
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1.5 mr-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div className="h-8 w-px bg-slate-200 mx-2" />

        {/* Filter button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={clsx(
            'relative px-4 py-2 mr-2 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
            showFilters || activeFiltersCount > 0
              ? 'bg-emerald-50 text-emerald-700'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          )}
          aria-label={`Filters${activeFiltersCount > 0 ? ` (${activeFiltersCount} active)` : ''}`}
          aria-expanded={showFilters}
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5" />
            <span className="text-sm font-semibold hidden sm:inline">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isFocused && !showFilters && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50"
            role="listbox"
          >
            {/* Recent Searches */}
            {recentSearches.length > 0 && !query && (
              <div className="p-3 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" />
                    Recent Searches
                  </div>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                {recentSearches.map((search) => (
                  <button
                    key={search}
                    onClick={() => {
                      setQuery(search);
                      handleSearch(search);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 rounded-xl transition-colors group"
                  >
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">
                      {search}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Search Results or Popular Locations */}
            <div className="p-3">
              <div className="flex items-center gap-2 px-1 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {query ? <MapPin className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                {query ? 'Suggestions' : 'Popular Locations'}
              </div>
              {(query ? filteredSuggestions : POPULAR_LOCATIONS.slice(0, 5)).map((suggestion) => {
                const isCommute = COMMUTE_HUBS.includes(suggestion);
                return (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setQuery(suggestion);
                      handleSearch(suggestion);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-emerald-50 rounded-xl transition-colors group"
                    role="option"
                  >
                    <div className={clsx('p-1.5 rounded-lg transition-colors', isCommute ? 'bg-sky-100 text-sky-600 group-hover:bg-sky-200' : 'bg-slate-100 group-hover:bg-emerald-100 group-hover:text-emerald-600')}>
                      {isCommute ? <Navigation className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">
                        {suggestion}
                      </span>
                      {isCommute && (
                        <span className="block text-[10px] text-slate-400">Commute filter</span>
                      )}
                    </div>
                  </button>
                );
              })}
              {query && filteredSuggestions.length === 0 && (
                <div className="px-3 py-6 text-center">
                  <p className="text-sm text-slate-500">No locations found for "{query}"</p>
                  <button
                    onClick={() => handleSearch(query)}
                    className="mt-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Search anyway →
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 p-4"
          >
            {/* Property Type */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Property Type
              </label>
              <div className="flex gap-2">
                {PROPERTY_TYPES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setFilters((f) => ({ ...f, propertyType: f.propertyType === id ? undefined : id }))}
                    className={clsx(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                      filters.propertyType === id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Price Range (KES)
              </label>
              <div className="flex flex-wrap gap-2">
                {PRICE_PRESETS.map(({ label, min, max }) => (
                  <button
                    key={label}
                    onClick={() => setFilters((f) => ({
                      ...f,
                      priceMin: f.priceMin === min ? undefined : min,
                      priceMax: f.priceMax === max ? undefined : max
                    }))}
                    className={clsx(
                      'px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                      filters.priceMin === min
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bedrooms */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Bedrooms
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, '5+'].map((num) => (
                  <button
                    key={num}
                    onClick={() => setFilters((f) => ({
                      ...f,
                      beds: f.beds === num ? undefined : Number(num) || 5
                    }))}
                    className={clsx(
                      'w-12 h-10 rounded-lg border text-sm font-semibold transition-all',
                      filters.beds === (Number(num) || 5)
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setFilters({});
                  onFilter({});
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => {
                  onFilter(filters);
                  setShowFilters(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
