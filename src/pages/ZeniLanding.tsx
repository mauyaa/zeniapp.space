import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchInsights, subscribeNewsletter, searchListings } from '../lib/api';
import type { ListingCard } from '../lib/api';
import { PropertyMap } from '../components/PropertyMap';
import { SERVICES, FAQS, MARQUEE_ITEMS, CTA_LINK_CLASSES } from './constants';
import { getFallbackHomeImage } from '../constants/images';
import { getPublicSocket, disconnectPublicSocket } from '../lib/publicSocket';
import { useAsyncEffect } from '../hooks/useAsyncEffect';
import { useMotion } from '../hooks/useMotion';
import { useKineticRing } from '../hooks/useKineticRing';
import { useCursor } from '../hooks/useCursor';
import { dedupeById, dedupeListingsByContent } from '../utils/dedupeById';
import { properties as FALLBACK_PROPERTIES, type Property } from '../utils/mockData';
import type { Project, InsightItem } from '../types/landing';
import { StepsSlider } from '../components/landing/StepsSlider';
import { TrustTiles } from '../components/landing/TrustTiles';
import { SafetySection } from '../components/landing/SafetySection';
import { AgentSection } from '../components/landing/AgentSection';
import { SiteIndexSection } from '../components/landing/SiteIndexSection';

const SUPPORT_TITLE_REGEX = /^Zeni Support$/i;
const PLACEHOLDER_TEXT = 'ZENI';

function hashColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash << 5) - hash + str.charCodeAt(i);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 62%)`;
}

function placeholderFromId(id: string, title?: string) {
  const color = hashColor(id);
  const bg2 = hashColor(title || `${id}-alt`);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>
    <defs>
      <linearGradient id='g' x1='0%' x2='100%' y1='0%' y2='100%'>
        <stop offset='0%' stop-color='${color}' stop-opacity='0.85'/>
        <stop offset='100%' stop-color='${bg2}' stop-opacity='0.85'/>
      </linearGradient>
    </defs>
    <rect width='800' height='600' fill='url(#g)'/>
    <text x='50%' y='50%' fill='white' font-family='Inter,Arial,sans-serif' font-size='48' font-weight='700' dominant-baseline='middle' text-anchor='middle'>${(title || PLACEHOLDER_TEXT).slice(0, 18)}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function isValidCoord(lat?: number, lng?: number): boolean {
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return false;
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) {
    return false;
  }
  return true;
}

function listingToPropertyForMap(listing: ListingCard): Property | null {
  const fallbackImage = getFallbackHomeImage();
  const lat = isValidCoord(listing.location?.lat, listing.location?.lng)
    ? (listing.location?.lat as number)
    : -1.2921;
  const lng = isValidCoord(listing.location?.lat, listing.location?.lng)
    ? (listing.location?.lng as number)
    : 36.8219;
  const primaryImg = listing.imageUrl || listing.images?.[0]?.url || listing.agent?.image;
  const image = primaryImg || placeholderFromId(listing.id, listing.title);
  return {
    id: listing.id,
    title: listing.title ?? 'Property',
    category: listing.category,
    description: listing.description,
    price: listing.price,
    currency: listing.currency ?? 'KES',
    purpose: (listing as { purpose?: 'rent' | 'buy' }).purpose ?? 'rent',
    type: (listing.type as Property['type']) ?? 'Apartment',
    location: {
      neighborhood: listing.location?.neighborhood ?? '',
      city: listing.location?.city ?? '',
      lat: lat as number,
      lng: lng as number,
    },
    features: { bedrooms: listing.beds ?? 0, bathrooms: listing.baths ?? 0, sqm: listing.sqm ?? 0 },
    isVerified: Boolean(listing.verified),
    imageUrl: image,
    agent: { name: listing.agent?.name ?? 'Agent', image: listing.agent?.image ?? fallbackImage },
  };
}

type GsapApi = {
  to: (target: object, vars: object) => void;
  from: (target: object, vars: object) => void;
  context: (callback: () => void, scope?: object) => { revert: () => void };
  utils: { toArray: <T>(selector: string) => T[] };
  set: (target: object, vars: object) => void;
  quickTo: (target: object, prop: string, opts?: object) => (value: number) => void;
};

const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
const env = meta?.env || {};
const CONTACT_EMAIL = (env.VITE_CONTACT_EMAIL as string)?.trim() || 'zeniapp.ke@gmail.com';
const CONTACT_PHONE = (env.VITE_CONTACT_PHONE as string)?.trim() || '';
const SOCIAL_INSTAGRAM = (env.VITE_SOCIAL_INSTAGRAM as string)?.trim() || '';
const SOCIAL_LINKEDIN = (env.VITE_SOCIAL_LINKEDIN as string)?.trim() || '';
const SOCIAL_TWITTER = (env.VITE_SOCIAL_TWITTER as string)?.trim() || '';

function formatKesPrice(price: number, isRental = false): string {
  if (isRental) return `KES ${(price / 1000).toFixed(0)}K/mo`;
  if (price >= 1_000_000) return `KES ${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `KES ${(price / 1_000).toFixed(0)}K`;
  return `KES ${price}`;
}

type NewsletterApiResponse = { status: 'created' | 'exists' | 'reactivated' };

export type NewsletterSubmissionResult = {
  status: 'success' | 'exists';
  message: string;
};

function getNewsletterSuccessResult(
  apiResponse: NewsletterApiResponse
): NewsletterSubmissionResult {
  if (apiResponse.status === 'exists') {
    return { status: 'exists', message: 'You are already subscribed.' };
  }
  if (apiResponse.status === 'reactivated') {
    return { status: 'success', message: 'Welcome back. You are subscribed again.' };
  }
  return { status: 'success', message: 'Thanks for joining. You are on the list.' };
}

function getNewsletterErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not subscribe.';
}

const NAV_SECTION_IDS = ['projects', 'neighborhoods', 'insights'] as const;
const SCROLL_SPY_VISIBILITY_THRESHOLD = 0.15;
const SCROLL_SPY_MIN_RATIO = 0.05;

const NAV_SECTIONS: { href: `#${string}`; label: string; sectionId: string }[] = [
  { href: '#projects', label: 'Inventory', sectionId: 'projects' },
  { href: '#neighborhoods', label: 'Locations', sectionId: 'neighborhoods' },
  { href: '#insights', label: 'Data', sectionId: 'insights' },
];

const MAP_EXPLORE_PATH = '/map';
const RING_IMAGE_COUNT = 8;
const MAP_LISTINGS_LIMIT = 50;
const INSIGHTS_LIMIT = 3;
const HERO_STATUS_CYCLE_MS = 1600;
const SCROLL_OFFSET_PX = -80;
const LANDING_REFRESH_MS = 8000;

const FALLBACK_RING_IMAGES = Array.from({ length: RING_IMAGE_COUNT }).map((_, i) =>
  placeholderFromId(`ring-fallback-${i}`, `Zeni ${i + 1}`)
);
const FALLBACK_MAP_PROPERTIES: Property[] = FALLBACK_PROPERTIES.slice(0, 8);
const PUBLIC_FEED_KEY =
  (import.meta.env.VITE_PUBLIC_FEED_KEY as string | undefined) || 'public-demo-key';

function isPlaceholder(url?: string) {
  return Boolean(url && url.startsWith('data:image/svg+xml'));
}

function preloadImages(urls: string[]): Promise<void> {
  const unique = Array.from(new Set(urls.filter(Boolean)));
  return Promise.all(
    unique.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        })
    )
  ).then(() => undefined);
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

const HERO_STATUS_LABELS = [
  'Verified',
  'Pending',
  'Syncing',
  'Locked',
  'Alert',
  'Processing',
  'Valuing',
  'Encrypting',
];

function listingCardToProject(item: ListingCard): Project {
  const isRental =
    (item as { purpose?: string }).purpose === 'rent' ||
    String(item.category || item.type || '')
      .toLowerCase()
      .includes('rent');

  const primaryImg = item.images?.find((i) => i.isPrimary)?.url;
  const anyImg = item.images?.[0]?.url;
  const fallbackImg = getFallbackHomeImage();
  const indexedItem = item as ListingCard & { _idx?: number };

  return {
    id: indexedItem._idx ?? 0,
    listingId: item.id,
    title: item.title || 'Property',
    location: (item.location?.neighborhood || item.location?.city || 'Kenya').toUpperCase(),
    type: (item.type || item.category || 'PROPERTY').toUpperCase(),
    price: formatKesPrice(item.price, isRental),
    image: primaryImg || anyImg || item.imageUrl || fallbackImg,
    alt: item.title || 'Property image',
  };
}

function buildRingImagesFromProjects(projects: Project[]): string[] {
  const slice = projects.slice(0, RING_IMAGE_COUNT);
  const seen = new Set<string>();
  const images: string[] = [];
  slice.forEach((p) => {
    const img = p.image;
    if (img && !seen.has(img)) {
      seen.add(img);
      images.push(img);
    }
  });
  return [...images, ...FALLBACK_RING_IMAGES].slice(0, RING_IMAGE_COUNT);
}

function MapFallbackBlock({ message, linkText }: { message: string; linkText: string }) {
  return (
    <div className="py-16 text-center">
      <p className="font-mono text-sm text-[var(--zeni-black)]/65 mb-4">{message}</p>
      <Link to={MAP_EXPLORE_PATH} className={CTA_LINK_CLASSES.outline}>
        {linkText}
      </Link>
    </div>
  );
}

function ProjectRowWrapper({ project, children }: { project: Project; children: React.ReactNode }) {
  if (project.listingId) {
    return <Link to={`/listing/${project.listingId}`}>{children}</Link>;
  }
  return <div>{children}</div>;
}

/** Interactive FAQ accordion — one item open at a time */
function FaqAccordion({ faqs }: { faqs: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="divide-y divide-[var(--zeni-black)]/8">
      {faqs.map((faq, i) => (
        <div key={faq.q}>
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between py-6 text-left group"
            aria-expanded={openIndex === i}
          >
            <span
              className={`text-base font-light transition-colors ${
                openIndex === i ? 'text-[var(--zeni-black)]' : 'text-[var(--zeni-black)]/70'
              } group-hover:text-[var(--zeni-black)]`}
            >
              {faq.q}
            </span>
            <span
              className={`ml-4 flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300 ${
                openIndex === i
                  ? 'border-[var(--zeni-green)] bg-[var(--zeni-green)] text-white rotate-45'
                  : 'border-[var(--zeni-black)]/15 text-[var(--zeni-black)]/40 group-hover:border-[var(--zeni-green)] group-hover:text-[var(--zeni-green)]'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </span>
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              openIndex === i ? 'max-h-48 pb-6' : 'max-h-0'
            }`}
          >
            <p className="text-sm text-[var(--zeni-black)]/60 leading-relaxed font-light pr-12">
              {faq.a}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ZeniLanding() {
  // --- State ---
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [insightsStatus, setInsightsStatus] = useState<'idle' | 'loading' | 'error'>('loading');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<
    'idle' | 'loading' | 'success' | 'error' | 'exists'
  >('idle');
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const [listingStats, setListingStats] = useState<{ total: number; verified: number } | null>(
    null
  );
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([]);
  const [featuredListingsLoading, setFeaturedListingsLoading] = useState(true);
  const [featuredListingsError, setFeaturedListingsError] = useState(false);
  const [ringImages, setRingImages] = useState<string[]>(() => FALLBACK_RING_IMAGES);
  const [mapListings, setMapListings] = useState<Property[]>([]);
  const [mapListingsLoading, setMapListingsLoading] = useState(true);
  const [activeNavSection, setActiveNavSection] = useState<string | null>(null);

  const navigate = useNavigate();

  // --- Refs ---
  const rootRef = useRef<HTMLDivElement>(null);
  const previewContainer = useRef<HTMLDivElement>(null);
  const previewImg = useRef<HTMLImageElement>(null);
  const heroStatusTextRef = useRef<HTMLSpanElement>(null);

  const { reduceMotion, coarsePointer, disableMotion, gsap, lenis, ScrollTrigger } = useMotion();
  useCursor({ enabled: false, gsap });

  useEffect(() => {
    const removeHidden = () => document.body.classList.remove('cursor-hidden');
    removeHidden();
    const observer = new MutationObserver(() => {
      if (document.body.classList.contains('cursor-hidden')) removeHidden();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    const intervalId = setInterval(removeHidden, 300);
    return () => {
      observer.disconnect();
      clearInterval(intervalId);
      removeHidden();
    };
  }, []);

  // Scroll-spy
  useEffect(() => {
    const sectionVisibilityRatios: Record<string, number> = {};
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          sectionVisibilityRatios[entry.target.id] = entry.intersectionRatio;
        });
        const sectionWithEnoughVisibility =
          NAV_SECTION_IDS.find(
            (id) => (sectionVisibilityRatios[id] ?? 0) > SCROLL_SPY_VISIBILITY_THRESHOLD
          ) ??
          NAV_SECTION_IDS.reduce((a, b) =>
            (sectionVisibilityRatios[a] ?? 0) >= (sectionVisibilityRatios[b] ?? 0) ? a : b
          );
        const activeSection =
          (sectionVisibilityRatios[sectionWithEnoughVisibility] ?? 0) > SCROLL_SPY_MIN_RATIO
            ? sectionWithEnoughVisibility
            : null;
        setActiveNavSection(activeSection);
      },
      { rootMargin: '-100px 0px -55% 0px', threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.5, 1] }
    );
    NAV_SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const fetchMapListings = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setMapListingsLoading(true);
    try {
      // Try verified-only first; fall back to all available listings so the map is never empty
      let items: ListingCard[] = [];

      const verifiedRes = await searchListings({
        limit: MAP_LISTINGS_LIMIT,
        availabilityOnly: true,
        verifiedOnly: true,
        noCache: true,
      }).catch(() => null);

      if (verifiedRes?.items?.length) {
        items = verifiedRes.items;
      } else {
        // Fallback: fetch all available listings (no verifiedOnly filter)
        const allRes = await searchListings({
          limit: MAP_LISTINGS_LIMIT,
          availabilityOnly: true,
          noCache: true,
        }).catch(() => null);
        items = allRes?.items ?? [];
      }

      const raw = items.filter((item) => !SUPPORT_TITLE_REGEX.test(item.title ?? ''));

      // Dedupe by ID
      const byId = new Map<string, ListingCard>();
      raw.forEach((item) => {
        if (!byId.has(item.id)) byId.set(item.id, item);
      });

      // Convert ALL listings to map properties — those without real coords get Nairobi CBD fallback
      // so the map always shows something rather than being empty
      const properties = Array.from(byId.values())
        .map(listingToPropertyForMap)
        .filter((p): p is Property => p !== null);

      setMapListings(properties.length ? properties : FALLBACK_MAP_PROPERTIES);
    } catch {
      setMapListings((prev) => (prev.length ? prev : FALLBACK_MAP_PROPERTIES));
    } finally {
      if (!opts?.silent) setMapListingsLoading(false);
    }
  }, []);

  useAsyncEffect(
    async (signal) => {
      if (signal.cancelled) return;
      await fetchMapListings();
    },
    [fetchMapListings]
  );

  useEffect(() => {
    const fromFeatured = featuredProjects
      .slice(0, RING_IMAGE_COUNT * 2)
      .map((p) => p.image)
      .filter((url): url is string => Boolean(url) && !isPlaceholder(url));

    const fromMap = mapListings
      .slice(0, MAP_LISTINGS_LIMIT)
      .map((p) => p.imageUrl)
      .filter((url): url is string => Boolean(url) && !isPlaceholder(url));

    const seen = new Set<string>();
    const combined: string[] = [];
    const pushUnique = (urls: string[]) => {
      urls.forEach((url) => {
        if (seen.has(url) || combined.length >= RING_IMAGE_COUNT) return;
        seen.add(url);
        combined.push(url);
      });
    };

    pushUnique(fromFeatured);
    pushUnique(fromMap);

    while (combined.length < RING_IMAGE_COUNT) {
      combined.push(FALLBACK_RING_IMAGES[combined.length % FALLBACK_RING_IMAGES.length]);
    }

    const nextImages = combined.slice(0, RING_IMAGE_COUNT);
    let cancelled = false;
    (async () => {
      if (arraysEqual(nextImages, ringImages)) return;
      await preloadImages(nextImages);
      if (!cancelled) {
        setRingImages(nextImages);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [featuredProjects, mapListings, ringImages]);

  const { stageRef, ringRef, ballRef, onPointerDown, onPointerMove, onPointerUp } = useKineticRing({
    images: ringImages,
    reduceMotion,
    gsap,
  });

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    const imgs = ring.querySelectorAll('.ring-item img');
    imgs.forEach((img) => {
      (img as HTMLImageElement).style.transition = 'opacity 0.25s ease';
      (img as HTMLImageElement).style.opacity = '1';
    });
  }, [ringImages, ringRef]);

  const scrollToSection = useCallback(
    (hash: string) => {
      if (!hash.startsWith('#')) return;
      const target = document.querySelector(hash);
      if (!target) return;
      if (lenis) {
        lenis.scrollTo(target as HTMLElement, { offset: SCROLL_OFFSET_PX });
        return;
      }
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [lenis]
  );

  useEffect(() => {
    let currentIndex = 0;
    const timer = setInterval(() => {
      currentIndex = (currentIndex + 1) % HERO_STATUS_LABELS.length;
      if (heroStatusTextRef.current) {
        heroStatusTextRef.current.textContent = HERO_STATUS_LABELS[currentIndex];
      }
    }, HERO_STATUS_CYCLE_MS);
    return () => clearInterval(timer);
  }, []);

  useAsyncEffect(async (signal) => {
    setInsightsStatus('loading');
    try {
      const res = await fetchInsights(INSIGHTS_LIMIT);
      if (signal.cancelled) return;
      setInsights(res?.items || []);
      setInsightsStatus('idle');
    } catch {
      if (!signal.cancelled) setInsightsStatus('error');
    }
  }, []);

  const refreshFeaturedAndStats = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setFeaturedListingsLoading(true);
      setFeaturedListingsError(false);
    }
    const limitOne = 1;
    const limitFeatured = 6;
    try {
      const [totalCountResult, verifiedCountResult, featuredListingsResult] = await Promise.all([
        searchListings({ limit: limitOne, availabilityOnly: true, noCache: true }).catch(
          () => null
        ),
        searchListings({
          verifiedOnly: true,
          availabilityOnly: true,
          limit: limitOne,
          noCache: true,
        }).catch(() => null),
        searchListings({
          limit: limitFeatured,
          availabilityOnly: true,
          verifiedOnly: true,
          noCache: true,
        }).catch(() => null),
      ]);

      if (!opts?.silent) setFeaturedListingsLoading(false);

      if (totalCountResult && verifiedCountResult) {
        setListingStats({
          total: totalCountResult.total ?? 0,
          verified: verifiedCountResult.total ?? 0,
        });
      }
      setFeaturedListingsError(!featuredListingsResult);
      if (featuredListingsResult?.items?.length) {
        const uniqueItems = dedupeListingsByContent(dedupeById(featuredListingsResult.items)).map(
          (item, idx) => ({ ...item, _idx: idx })
        );
        const projects = uniqueItems.map((item) => listingCardToProject(item));
        setFeaturedProjects(projects);
        setRingImages(buildRingImagesFromProjects(projects));
      } else if (!opts?.silent) {
        setFeaturedProjects([]);
        setRingImages(FALLBACK_RING_IMAGES);
      }
    } catch {
      if (!opts?.silent) {
        setFeaturedListingsLoading(false);
        setFeaturedListingsError(true);
      }
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchMapListings({ silent: true });
      refreshFeaturedAndStats({ silent: true });
    };
    const id = window.setInterval(tick, LANDING_REFRESH_MS);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('online', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('online', tick);
    };
  }, [fetchMapListings, refreshFeaturedAndStats]);

  useEffect(() => {
    const socket = getPublicSocket(PUBLIC_FEED_KEY);
    const onChange = () => {
      fetchMapListings({ silent: true });
      refreshFeaturedAndStats({ silent: true });
    };
    socket.on('listing:changed', onChange);
    socket.on('listing:deleted', onChange);
    return () => {
      socket.off('listing:changed', onChange);
      socket.off('listing:deleted', onChange);
      disconnectPublicSocket();
    };
  }, [fetchMapListings, refreshFeaturedAndStats]);

  useAsyncEffect(
    async (signal) => {
      await refreshFeaturedAndStats();
      if (signal.cancelled) return;
    },
    [refreshFeaturedAndStats]
  );

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = newsletterEmail.trim();
    if (!trimmedEmail) {
      setNewsletterStatus('error');
      setNewsletterMessage('Email is required.');
      return;
    }
    setNewsletterStatus('loading');
    setNewsletterMessage('');
    try {
      const apiResponse = await subscribeNewsletter(trimmedEmail, 'landing');
      const result = getNewsletterSuccessResult(apiResponse);
      setNewsletterStatus(result.status);
      setNewsletterMessage(result.message);
      setNewsletterEmail('');
    } catch (error) {
      setNewsletterStatus('error');
      setNewsletterMessage(getNewsletterErrorMessage(error));
    }
  };

  const showProjectPreview = (imageUrl: string | null) => {
    const gsapApi = gsap as GsapApi | null;
    if (!gsapApi) return;
    const imageElement = previewImg.current;
    const container = previewContainer.current;
    const shouldShowPreview = Boolean(imageUrl && imageElement && container);
    if (shouldShowPreview && imageElement && container && imageUrl) {
      imageElement.src = imageUrl;
      gsapApi.to(container, { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' });
      return;
    }
    if (container) {
      gsapApi.to(container, { opacity: 0, scale: 0.8, duration: 0.3 });
    }
  };

  const onNavAnchorClick = useCallback(
    (e: React.MouseEvent<HTMLElement>, href: string) => {
      if (!href.startsWith('#')) return;
      e.preventDefault();
      scrollToSection(href);
    },
    [scrollToSection]
  );

  useEffect(() => {
    const gsapApi = gsap as GsapApi | null;
    if (disableMotion || !gsapApi || !ScrollTrigger) return;
    const ctx = gsapApi.context(() => {
      gsapApi.utils.toArray<HTMLElement>('.split-text').forEach((el: HTMLElement) => {
        gsapApi.from(el, {
          y: 60,
          opacity: 0,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%' },
        });
      });
      gsapApi.utils.toArray<HTMLElement>('.reveal-up').forEach((el: HTMLElement) => {
        gsapApi.from(el, {
          y: 40,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%' },
        });
      });
    }, rootRef.current || undefined);
    return () => ctx.revert();
  }, [disableMotion, gsap, ScrollTrigger]);

  useEffect(() => {
    const gsapApi = gsap as GsapApi | null;
    if (disableMotion || !gsapApi) return;
    const magneticElements = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>('.magnetic') ?? []
    );
    const cleanups: Array<() => void> = [];
    magneticElements.forEach((element) => {
      const onMouseMove = (e: MouseEvent) => {
        const rect = element.getBoundingClientRect();
        const offsetX = e.clientX - rect.left - rect.width / 2;
        const offsetY = e.clientY - rect.top - rect.height / 2;
        gsapApi.to(element, {
          x: offsetX * 0.3,
          y: offsetY * 0.3,
          duration: 0.3,
          ease: 'power2.out',
        });
        document.body.classList.add('sticking');
      };
      const onMouseLeave = () => {
        gsapApi.to(element, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
        document.body.classList.remove('sticking');
      };
      element.addEventListener('mousemove', onMouseMove);
      element.addEventListener('mouseleave', onMouseLeave);
      cleanups.push(() => {
        element.removeEventListener('mousemove', onMouseMove);
        element.removeEventListener('mouseleave', onMouseLeave);
      });
    });
    return () => cleanups.forEach((fn) => fn());
  }, [disableMotion, gsap]);

  useEffect(() => {
    const gsapApi = gsap as GsapApi | null;
    const container = previewContainer.current;
    if (!gsapApi || !container) return;
    const animateX = gsapApi.quickTo(container, 'x', { duration: 0.45, ease: 'power2.out' });
    const animateY = gsapApi.quickTo(container, 'y', { duration: 0.45, ease: 'power2.out' });
    const onMouseMove = (e: MouseEvent) => {
      animateX(e.clientX);
      animateY(e.clientY);
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [gsap]);

  const newsletterMessageClassName =
    newsletterStatus === 'error' ? 'zeni-orange-text' : 'text-[#059669]';

  const socialLinks = [
    {
      href: SOCIAL_INSTAGRAM || '#contact',
      label: 'Instagram',
      abbr: 'IG',
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" strokeLinecap="round" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
        </svg>
      ),
    },
    {
      href: SOCIAL_LINKEDIN || '#contact',
      label: 'LinkedIn',
      abbr: 'LI',
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      ),
    },
    {
      href: SOCIAL_TWITTER || '#contact',
      label: 'X (Twitter)',
      abbr: 'X',
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      ref={rootRef}
      className={`bg-[#fcfcfc] text-[#0a0a0a] font-sans selection:bg-[#0a0a0a] selection:text-white overflow-x-hidden ${disableMotion ? 'reduce-motion' : ''}`}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600;700&family=Outfit:wght@400;500&family=Space+Mono:wght@400;700&display=swap');
        :root {
          --ring-width: 180px;
          --ring-height: 250px;
          --radius: 320px;
          --zeni-black: #0a0a0a;
          --zeni-green: #059669;
          --zeni-orange: #FF4500;
          --zeni-white: #fcfcfc;
          --active-color: var(--zeni-green);
        }
        .font-sans { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'Space Mono', monospace; }
        .zeni-display { font-family: 'Inter', sans-serif; letter-spacing: -0.04em; }
        .zeni-tagline { font-family: 'Inter', sans-serif; letter-spacing: 0.35em; font-weight: 300; }
        .zeni-orange-text {
          font-family: 'Outfit', sans-serif;
          font-weight: 500;
          letter-spacing: 0.06em;
          color: var(--zeni-orange) !important;
          text-shadow: 0 1px 0 rgba(0,0,0,0.12);
          -webkit-font-smoothing: antialiased;
        }
        .zeni-orange-text.line-below {
          position: relative;
          padding-bottom: 0.5em;
          display: inline-block;
        }
        .zeni-orange-text.line-below::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 1.5em;
          right: 1.5em;
          height: 2px;
          background: var(--zeni-orange);
        }
        @keyframes stateCycle {
          0%, 50% { --active-color: var(--zeni-green); }
          50.1%, 100% { --active-color: var(--zeni-black); }
        }
        .kinetic-engine { animation: stateCycle 10s infinite step-end; }
        @keyframes snappyBounce { 0%, 100% { transform: translateY(-60px); } 50% { transform: translateY(60px); } }
        .kinetic-ball-outer { transform-style: preserve-3d; }
        .kinetic-ball-inner {
          transform-style: flat; width: 100%; height: 100%; border-radius: 50%;
          animation: snappyBounce 1s infinite cubic-bezier(0.42, 0, 0.58, 1);
          background: radial-gradient(circle at 30% 30%, var(--zeni-white) 0%, var(--active-color) 80%);
          box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid rgba(255,255,255,0.4);
        }
        .stage-3d { perspective: 1500px; transform-style: preserve-3d; }
        .ring-3d { transform-style: preserve-3d; }
        .ring-item { position: absolute; width: 100%; height: 100%; transform-style: preserve-3d; will-change: transform, filter; transition: transform 0.6s ease, opacity 0.6s ease, filter 0.6s ease; }
        .ring-item img { transform: translateZ(0.01px); will-change: transform, opacity; transition: transform 0.6s ease, opacity 0.6s ease; }
        @media (prefers-reduced-motion: reduce) {
          .kinetic-engine { animation: none; }
          .kinetic-ball-inner { animation: none; }
          .ring-3d { transition: none; }
        }
        .text-neutral-400 { color: var(--zeni-black); opacity: 0.6; }
        .text-neutral-500 { color: var(--zeni-black); opacity: 0.55; }
        @media (max-width: 768px) {
          button, a { min-height: 44px; min-width: 44px; }
        }
        body.cursor-hidden { cursor: none; }
        .grain-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9000; opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          animation: grainShift 8s steps(10) infinite;
        }
        @keyframes grainShift { 0% { transform: translate(0,0); } 100% { transform: translate(-5%, -5%); } }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--zeni-white); }
        ::-webkit-scrollbar-thumb { background: rgba(10,10,10,0.15); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--zeni-black); }
        body.sticking .cursor-circle { width: 50px; height: 50px; border-color: var(--zeni-black); background: transparent; }
        @media (pointer: coarse), (hover: none) { body { cursor: auto; } .cursor-dot, .cursor-circle { display: none; } }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-animate { animation: fadeSlideUp 0.7s ease-out forwards; }
        .hero-animate-delay-1 { animation: fadeSlideUp 0.7s 0.15s ease-out both; }
        .hero-animate-delay-2 { animation: fadeSlideUp 0.7s 0.3s ease-out both; }
        .hero-animate-delay-3 { animation: fadeSlideUp 0.7s 0.45s ease-out both; }
        .hero-animate-delay-4 { animation: fadeSlideUp 0.7s 0.6s ease-out both; }
        .stat-card {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(10,10,10,0.06);
          border-radius: 16px;
          padding: 20px 24px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .mobile-stat-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(5,150,105,0.08);
          border: 1px solid rgba(5,150,105,0.2);
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 11px;
          font-family: 'Space Mono', monospace;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--zeni-green);
        }
      `}</style>

      {!disableMotion && <div className="grain-overlay" aria-hidden="true" />}

      {/* Fixed frames */}
      <div
        className="fixed top-0 left-0 w-full h-3 bg-[var(--zeni-green)] z-[60]"
        aria-hidden="true"
      />
      <div
        className="fixed bottom-0 left-0 w-full h-3 bg-[var(--zeni-green)] z-[60] flex justify-between px-6 items-center pointer-events-none"
        aria-hidden="true"
      >
        <span className="text-[11px] font-mono uppercase tracking-widest text-white/80">Kenya</span>
        <span className="text-[11px] font-mono uppercase tracking-widest text-white/80">
          Est. 2026 · KES
        </span>
      </div>
      <div
        className="fixed top-0 left-0 w-3 h-full bg-[var(--zeni-white)] z-[60]"
        aria-hidden="true"
      />
      <div
        className="fixed top-0 right-0 w-3 h-full bg-[var(--zeni-white)] z-[60]"
        aria-hidden="true"
      />

      {/* Navbar */}
      <header className="fixed top-4 left-6 right-6 z-50 py-3 px-6 flex justify-between items-center bg-[var(--zeni-white)]/90 backdrop-blur-xl shadow-sm rounded-lg border border-[var(--zeni-black)]/5">
        <div className="flex flex-col gap-0.5">
          <div className="magnetic text-2xl font-serif font-bold tracking-tight leading-none cursor-pointer">
            <Link to="/" className="hover:opacity-90 transition-opacity" aria-label="Zeni Home">
              ZENI<span className="text-[var(--zeni-green)]">.</span>
            </Link>
          </div>
          <span className="text-[11px] md:text-xs font-sans font-extralight uppercase tracking-[0.25em] text-[var(--zeni-black)]/70">
            Real Estate System
          </span>
        </div>
        <div className="flex items-center gap-6 md:gap-8">
          <nav
            className="hidden md:flex gap-8 text-xs font-mono uppercase tracking-widest text-[var(--zeni-black)]/65"
            aria-label="Main Navigation"
          >
            {NAV_SECTIONS.map(({ href, label, sectionId }) => (
              <a
                key={sectionId}
                href={href}
                onClick={(e) => onNavAnchorClick(e, href)}
                className={`magnetic transition-colors ${activeNavSection === sectionId ? 'text-[var(--zeni-green)]' : 'hover:text-black'}`}
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className={`magnetic font-mono text-xs uppercase tracking-widest transition-colors ${activeNavSection === null ? 'text-[var(--zeni-green)]' : 'text-[var(--zeni-black)]/55 hover:text-[var(--zeni-black)]'}`}
            >
              Log in
            </Link>
            <Link to="/register" className={CTA_LINK_CLASSES.primary}>
              Sign up free
            </Link>
          </div>
          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/login"
              className="rounded-full border border-[var(--zeni-black)]/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--zeni-black)]/70 bg-white/90 backdrop-blur-sm"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-widest bg-[var(--zeni-green)] text-white shadow-sm"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-20 kinetic-engine px-4 md:px-8 border-l border-r border-transparent">
        {/* ── HERO SECTION ── */}
        <section
          id="hero"
          className="relative min-h-[100vh] flex flex-col border-b border-[var(--zeni-black)]/10 overflow-hidden bg-[var(--zeni-white)]"
        >
          {/* Subtle grid overlay */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              opacity: 0.04,
              backgroundImage:
                'linear-gradient(rgba(11,12,12,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(11,12,12,0.08) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          {/* Green glow */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-20%',
              right: '-10%',
              width: '60%',
              height: '80%',
              background: 'radial-gradient(ellipse, rgba(5,150,105,0.12) 0%, transparent 70%)',
              zIndex: 0,
            }}
          />

          <div className="relative z-10 flex-1 flex flex-col justify-center w-full max-w-[1600px] mx-auto px-6 md:px-16 pt-4 pb-12">
            {/* Top row: live pill + tagline */}
            <div className="hero-animate flex flex-wrap items-center gap-4 mb-10">
              <div className="flex items-center gap-2 bg-white/85 border border-[var(--zeni-black)]/12 rounded-full px-4 py-2">
                <span
                  className="w-2 h-2 rounded-full bg-[var(--zeni-green)] animate-pulse"
                  aria-hidden="true"
                />
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--zeni-black)]/60">
                  Live · <span ref={heroStatusTextRef}>Verified</span>
                </span>
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--zeni-green)]/70 hidden md:block">
                Kenya's #1 Verified Property Platform
              </span>
            </div>

            {/* Main headline + ring side by side */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-0 items-center">
              <div className="md:col-span-6 flex flex-col">
                <h1 className="hero-animate-delay-1 font-sans text-[clamp(3.5rem,10vw,7rem)] leading-[0.88] tracking-[-0.04em] text-[var(--zeni-black)] uppercase mb-8">
                  <span className="block font-extralight text-[var(--zeni-black)]/55">Where</span>
                  <span className="block font-black text-[var(--zeni-black)]">Kenya</span>
                  <span className="block font-extralight" style={{ color: 'var(--zeni-green)' }}>
                    Lives.
                  </span>
                </h1>

                <p className="hero-animate-delay-2 max-w-md text-base md:text-lg text-[var(--zeni-black)]/65 leading-relaxed mb-10 font-light">
                  Verified listings, intelligent mapping, and architectural precision for the modern
                  Kenyan buyer and renter.
                </p>

                {/* Dual CTA */}
                <div className="hero-animate-delay-3 flex flex-wrap gap-4 mb-12">
                  <Link
                    to="/register"
                    className="font-mono text-xs uppercase tracking-[0.15em] px-8 py-4 rounded-xl bg-[var(--zeni-green)] text-white hover:opacity-90 transition-all shadow-lg shadow-emerald-900/40"
                  >
                    Get started free →
                  </Link>
                  <a
                    href="#projects"
                    onClick={(e) => onNavAnchorClick(e, '#projects')}
                    className="font-mono text-xs uppercase tracking-[0.15em] px-8 py-4 rounded-xl border border-[var(--zeni-black)]/20 text-[var(--zeni-black)]/70 hover:border-[var(--zeni-black)]/40 hover:text-[var(--zeni-black)] transition-all"
                  >
                    View Inventory ↓
                  </a>
                </div>

                {/* Inline stats row */}
                <div className="hero-animate-delay-4 flex flex-wrap gap-6 md:gap-10 border-t border-[var(--zeni-black)]/10 pt-8">
                  <div>
                    <div className="text-2xl md:text-3xl font-light text-[var(--zeni-black)]">
                      {listingStats ? `${listingStats.verified}+` : '—'}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--zeni-black)]/45 mt-1">
                      Verified Listings
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl md:text-3xl font-light text-[var(--zeni-black)]">
                      {listingStats ? `${listingStats.total}+` : '—'}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--zeni-black)]/45 mt-1">
                      Total Listings
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-2xl md:text-3xl font-light"
                      style={{ color: 'var(--zeni-green)' }}
                    >
                      100%
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--zeni-black)]/45 mt-1">
                      Agent Vetted
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl md:text-3xl font-light text-[var(--zeni-black)]">
                      6+
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--zeni-black)]/45 mt-1">
                      Neighborhoods
                    </div>
                  </div>
                </div>
              </div>

              {/* Kinetic ring — right side */}
              <div
                ref={stageRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                className="md:col-span-6 relative h-[50vh] md:h-[75vh] stage-3d flex items-center justify-center cursor-grab active:cursor-grabbing"
                style={{ touchAction: coarsePointer ? 'auto' : 'none', transform: 'translateZ(0)' }}
                aria-hidden="true"
              >
                <div ref={ringRef} className="ring-3d relative w-[180px] h-[250px] z-10">
                  <div
                    ref={ballRef}
                    className="kinetic-ball-outer absolute left-1/2 top-1/2 w-10 h-10 pointer-events-none"
                    style={{ transform: 'translate(-50%, -50%) translateZ(0)' }}
                  >
                    <div className="kinetic-ball-inner" />
                  </div>
                  {ringImages.map((src, i) => (
                    <div
                      key={i}
                      className="ring-item"
                      style={{ transform: `rotateY(${i * 45}deg) translateZ(320px)` }}
                    >
                      <img
                        src={src}
                        alt={featuredProjects[i]?.alt || 'Property preview'}
                        className="w-full h-full object-cover rounded-sm shadow-2xl"
                        loading="eager"
                        decoding="async"
                        onError={(event) => {
                          const fallback = FALLBACK_RING_IMAGES[i % FALLBACK_RING_IMAGES.length];
                          if (event.currentTarget.src !== fallback) {
                            event.currentTarget.src = fallback;
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom ticker bar */}
          <div className="relative z-10 border-t border-[var(--zeni-black)]/8 py-3 overflow-hidden bg-[var(--zeni-white)]">
            <div className="flex gap-12 font-mono text-[10px] uppercase tracking-widest text-[var(--zeni-black)]/45 whitespace-nowrap animate-[marquee_30s_linear_infinite]">
              {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
                <span key={i} className="flex items-center gap-3">
                  <span className="w-1 h-1 rounded-full bg-[var(--zeni-green)] inline-block" />
                  {item === 'Verified Listings' && listingStats
                    ? `${listingStats.verified.toLocaleString()} Verified Listings`
                    : item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── MARQUEE ── */}
        <div
          className="py-5 border-b border-[var(--zeni-black)]/5 overflow-hidden bg-[var(--zeni-white)]"
          aria-hidden="true"
        >
          <div className="flex gap-16 font-mono text-xs uppercase tracking-widest text-[var(--zeni-black)]/65 whitespace-nowrap animate-[marquee_25s_linear_infinite]">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].flatMap((item, i, arr) => {
              const text =
                item === 'Verified Listings' && listingStats
                  ? `${listingStats.verified.toLocaleString()} Verified Listings`
                  : item;
              const parts: React.ReactNode[] = [<span key={`t-${i}`}>{text}</span>];
              if (i < arr.length - 1)
                parts.push(
                  <span key={`s-${i}`} className="zeni-orange-text">
                    /
                  </span>
                );
              return parts;
            })}
          </div>
        </div>

        {/* ── MAP SECTION ── */}
        <section
          id="neighborhoods"
          className="py-20 px-4 md:px-12 border-b border-[var(--zeni-black)]/10 bg-[var(--zeni-white)] scroll-mt-28"
        >
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16 items-center">
            <div className="md:col-span-4 reveal-up">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] zeni-orange-text line-below">
                Map-first
              </h2>
              <p className="mt-6 text-4xl md:text-5xl font-light leading-tight tracking-tight text-[var(--zeni-black)]">
                Draw your zone.
                <br />
                <span className="font-medium">See what&apos;s real.</span>
              </p>
              <p className="mt-6 text-[var(--zeni-black)]/55 leading-relaxed font-light">
                Visualize price clusters, verify amenities, and ensure you&apos;re dealing with
                vetted agents across Kenya. Your search, visually verified.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link to={MAP_EXPLORE_PATH} className={CTA_LINK_CLASSES.primaryBlock}>
                  Open live map
                </Link>
              </div>
            </div>

            <div className="md:col-span-8 reveal-up">
              <div className="rounded-2xl border border-[var(--zeni-black)]/5 overflow-hidden bg-[var(--zeni-white)] shadow-sm group cursor-pointer">
                <div className="p-6 md:p-8 border-b border-[var(--zeni-black)]/5 bg-[var(--zeni-white)]">
                  <div className="font-mono text-xs uppercase tracking-[0.2em] zeni-orange-text line-below inline-block">
                    Map Preview
                  </div>
                  <div className="mt-2 text-2xl font-light text-[var(--zeni-black)]">
                    Kenya overview
                  </div>
                </div>
                <div className="w-full min-h-[280px] sm:min-h-[320px] aspect-[4/3] md:aspect-video bg-[var(--zeni-white)] relative overflow-hidden rounded-b-2xl">
                  {mapListingsLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#F7F2EA]">
                      <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--zeni-black)]/55">
                        Loading map…
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="absolute inset-0 z-[1]">
                        <PropertyMap
                          properties={mapListings}
                          selectedId={null}
                          onSelect={(id) => navigate(`/listing/${id}`)}
                          center={[-1.2921, 36.8219]}
                          zoom={12}
                        />
                      </div>
                      {mapListings.length === 0 && (
                        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-[#F7F2EA]/80 backdrop-blur-[2px] pointer-events-none">
                          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--zeni-black)]/65 px-4 py-2 rounded-full border border-[var(--zeni-black)]/10 bg-white/90">
                            No listings with location data — open full map below
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PHILOSOPHY ── */}
        <section id="about" className="py-20 px-4 md:px-12 bg-[var(--zeni-white)]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16">
            <div className="col-span-12 md:col-span-3">
              <h2 className="font-mono text-xs uppercase tracking-widest zeni-orange-text line-below">
                Philosophy
              </h2>
            </div>
            <div className="col-span-12 md:col-span-9">
              <p className="text-3xl md:text-5xl font-light leading-tight mb-16 split-text text-[var(--zeni-black)] tracking-tight">
                Kenya's market is noisy. <br />
                <span className="font-medium">We verify reality.</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="reveal-up">
                  <p className="text-[var(--zeni-black)]/55 leading-relaxed mb-8 font-light">
                    Every agent is vetted. Every title deed verified. Every viewing tracked. We
                    don't just list properties—we curate confidence for Kenyan buyers, renters, and
                    owners.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section
          id="how-it-works"
          className="py-20 px-4 md:px-12 border-t border-b border-[var(--zeni-black)]/8 bg-[var(--zeni-white)] scroll-mt-28"
        >
          <div className="max-w-7xl mx-auto">
            <div className="mb-16 reveal-up">
              <span className="font-mono text-xs uppercase tracking-widest zeni-orange-text line-below mb-4 inline-block">
                How it works
              </span>
              <h2 className="mt-6 text-4xl md:text-5xl font-light tracking-tight text-[var(--zeni-black)]">
                Four steps to your <br />
                <span className="font-medium">next home.</span>
              </h2>
            </div>
            <StepsSlider />
          </div>
        </section>

        {/* ── SERVICES ── */}
        <section
          id="services"
          className="border-b border-[var(--zeni-black)]/5 bg-[var(--zeni-white)]"
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            {SERVICES.map((service, index) => (
              <article
                key={service.id}
                className={`p-16 border-[var(--zeni-black)]/5 hover:bg-[var(--zeni-white)] transition-colors group ${
                  index % 2 === 0 ? 'md:border-r' : ''
                } ${index < 2 ? 'border-b' : ''}`}
              >
                <div className="font-mono text-xs text-[var(--zeni-green)] mb-8" aria-hidden="true">
                  {service.id}.
                </div>
                <h3 className="text-2xl font-medium mb-3 group-hover:translate-x-2 transition-transform duration-300 tracking-tight text-[var(--zeni-black)]">
                  {service.title}
                </h3>
                <p className="text-[var(--zeni-black)]/55 leading-relaxed max-w-sm font-light text-sm">
                  {service.desc}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ── TRUST TILES + SAFETY ── */}
        <section
          id="trust"
          className="py-20 px-4 md:px-12 border-b border-[var(--zeni-black)]/8 bg-[var(--zeni-white)] scroll-mt-28"
        >
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="reveal-up">
              <span className="font-mono text-xs uppercase tracking-widest zeni-orange-text line-below mb-4 inline-block">
                Trust & Safety
              </span>
              <h2 className="mt-6 text-4xl md:text-5xl font-light tracking-tight text-[var(--zeni-black)]">
                Built for trust, <br />
                <span className="font-medium">from the ground up.</span>
              </h2>
              <p className="mt-4 text-[var(--zeni-black)]/55 font-light max-w-xl">
                Real estate is Kenya's biggest financial decision. We take that seriously.
              </p>
            </div>
            <div className="reveal-up">
              <TrustTiles />
            </div>
            <div className="reveal-up">
              <SafetySection />
            </div>
          </div>
        </section>

        {/* ── FEATURED INVENTORY ── */}
        <section
          id="projects"
          className="py-20 px-4 md:px-12 border-b border-[var(--zeni-black)]/10 bg-[var(--zeni-white)] scroll-mt-28"
        >
          <div className="max-w-[1400px] mx-auto">
            <div className="flex justify-between items-end mb-24 px-4">
              <div className="reveal-up">
                <span className="font-mono text-xs uppercase tracking-widest zeni-orange-text line-below mb-4 inline-block">
                  Selected Inventory
                </span>
                <h2 className="text-4xl md:text-6xl font-light tracking-tight text-[var(--zeni-black)]">
                  Curated <br />
                  <span className="font-medium">Spaces.</span>
                </h2>
              </div>
              {listingStats && (
                <div className="hidden md:flex flex-col items-end gap-1 reveal-up">
                  <span className="font-mono text-xs uppercase tracking-widest text-[var(--zeni-black)]/40">
                    Live inventory
                  </span>
                  <span className="text-2xl font-light text-[var(--zeni-black)]">
                    {listingStats.total.toLocaleString()}
                    <span className="text-sm text-[var(--zeni-black)]/40 ml-1">listings</span>
                  </span>
                </div>
              )}
            </div>

            <div
              className="grid grid-cols-12 pb-4 px-4 border-b border-[var(--zeni-black)]/10 uppercase text-xs font-mono tracking-widest text-[var(--zeni-black)]/60"
              aria-hidden="true"
            >
              <div className="col-span-6 md:col-span-5">Property</div>
              <div className="col-span-3 md:col-span-2 hidden md:block">Location</div>
              <div className="col-span-3 md:col-span-2 hidden md:block">Type</div>
              <div className="col-span-6 md:col-span-3 text-right">Price</div>
            </div>

            <div className="project-list" aria-live="polite">
              {featuredListingsLoading ? (
                <div className="py-16 text-center font-mono text-sm uppercase tracking-widest text-[var(--zeni-black)]/55">
                  Loading live listings…
                </div>
              ) : featuredListingsError ? (
                <MapFallbackBlock
                  message="Unable to load listings right now."
                  linkText="Try the map"
                />
              ) : featuredProjects.length === 0 ? (
                <MapFallbackBlock
                  message="No listings yet. Be the first to list or browse the map."
                  linkText="Browse map"
                />
              ) : (
                featuredProjects.map((project) => (
                  <ProjectRowWrapper key={project.listingId ?? project.id} project={project}>
                    <div
                      className="group relative border-b border-[var(--zeni-black)]/10 transition-colors hover:bg-[var(--zeni-white)] cursor-pointer"
                      onMouseEnter={() => showProjectPreview(project.image)}
                      onMouseLeave={() => showProjectPreview(null)}
                    >
                      <div className="block py-10 px-4">
                        <div className="grid grid-cols-12 items-center">
                          <div className="col-span-6 md:col-span-5 text-xl md:text-3xl font-light group-hover:translate-x-4 transition-transform duration-500">
                            {project.title}
                          </div>
                          <div className="col-span-2 hidden md:block font-mono text-xs text-[var(--zeni-black)]/65 uppercase">
                            {project.location}
                          </div>
                          <div className="col-span-2 hidden md:block font-mono text-xs text-[var(--zeni-black)]/65 uppercase">
                            {project.type}
                          </div>
                          <div className="col-span-6 md:col-span-3 text-right font-mono text-xs md:text-sm">
                            {project.price}
                          </div>
                        </div>
                      </div>
                    </div>
                  </ProjectRowWrapper>
                ))
              )}
            </div>

            {!featuredListingsLoading && !featuredListingsError && featuredProjects.length > 0 && (
              <div className="mt-16 text-center reveal-up">
                <Link
                  to={MAP_EXPLORE_PATH}
                  className="magnetic inline-block border border-[var(--zeni-black)]/10 px-10 py-4 font-mono text-xs uppercase tracking-widest hover:border-[var(--zeni-orange)] hover:bg-[var(--zeni-orange)] hover:text-white transition-all duration-300 rounded"
                >
                  Explore All on Map
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Floating project preview */}
        <div
          ref={previewContainer}
          className="fixed top-0 left-0 w-[320px] h-[220px] z-50 pointer-events-none opacity-0 overflow-hidden border border-[var(--zeni-black)]/10 bg-[var(--zeni-white)] hidden md:block"
          aria-hidden="true"
        >
          <img
            ref={previewImg}
            src=""
            alt="Project Preview"
            className="w-full h-full object-cover"
          />
        </div>

        {/* ── AGENT SECTION ── */}
        <section
          id="agents"
          className="py-20 px-4 md:px-12 border-b border-[var(--zeni-black)]/8 bg-[var(--zeni-white)] scroll-mt-28"
        >
          <div className="max-w-7xl mx-auto">
            <div className="mb-12 reveal-up">
              <span className="font-mono text-xs uppercase tracking-widest zeni-orange-text line-below mb-4 inline-block">
                For Agents
              </span>
            </div>
            <div className="reveal-up">
              <AgentSection />
            </div>
          </div>
        </section>

        {/* ── INSIGHTS ── */}
        <section id="insights" className="py-32 px-4 md:px-12 bg-[var(--zeni-white)] scroll-mt-28">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16">
            <div className="md:col-span-6">
              <h2 className="text-xs font-mono uppercase tracking-widest zeni-orange-text line-below mb-6 inline-block">
                Market Intelligence
              </h2>
              <p className="text-3xl md:text-4xl font-light leading-tight tracking-tight text-[var(--zeni-black)]">
                Data-driven <br /> <span className="font-medium">decision clarity.</span>
              </p>
              <div className="mt-12 space-y-2" aria-live="polite">
                {insightsStatus === 'loading' && (
                  <div className="text-xs font-mono uppercase tracking-widest text-[var(--zeni-black)]/55">
                    Loading insights…
                  </div>
                )}
                {insightsStatus === 'error' && (
                  <div className="text-xs font-mono uppercase tracking-widest zeni-orange-text">
                    Live insights unavailable.
                  </div>
                )}
                {insightsStatus === 'idle' && insights.length === 0 && (
                  <div className="text-sm text-[var(--zeni-black)]/55 font-light">
                    No insights this week.
                  </div>
                )}
                {insights.map((insight) => (
                  <article
                    key={insight.title + (insight.id ?? '')}
                    className="border-b border-[var(--zeni-black)]/5 py-8 group"
                  >
                    <div className="text-xs font-mono uppercase tracking-widest text-[var(--zeni-green)] mb-3">
                      {insight.tag}
                    </div>
                    <h3 className="text-xl font-medium mb-3 text-[var(--zeni-black)]">
                      {insight.title}
                    </h3>
                    <p className="text-sm text-[var(--zeni-black)]/55 leading-relaxed font-light">
                      {insight.desc}
                    </p>
                    {insight.href && (
                      <a
                        href={insight.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="magnetic inline-flex items-center mt-5 text-xs font-mono uppercase tracking-widest text-[var(--zeni-black)]/55 hover:text-[var(--zeni-black)] transition-colors"
                      >
                        Read Brief →
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </div>

            <aside className="md:col-span-5 md:col-start-8">
              <div className="bg-[var(--zeni-white)] p-10 rounded border border-[var(--zeni-black)]/5 sticky top-32">
                <h3 className="text-xs font-mono uppercase tracking-widest zeni-orange-text line-below mb-4 inline-block">
                  The Brief
                </h3>
                <p className="text-2xl font-light text-[var(--zeni-black)]">
                  The Kenya market note.
                </p>
                <p className="text-sm text-[var(--zeni-black)]/55 mt-3 leading-relaxed font-light">
                  Quietly delivered. High signal, low noise. For buyers, owners, and agents.
                </p>
                <form className="mt-8 space-y-4" onSubmit={handleNewsletterSubmit}>
                  <label htmlFor="newsletter-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="newsletter-email"
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Email address"
                    required
                    className="w-full bg-transparent border-b border-neutral-300 py-3 text-sm outline-none focus:border-neutral-800 font-light transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={newsletterStatus === 'loading'}
                    className="magnetic w-full bg-[var(--zeni-green)] text-white py-3.5 text-xs font-mono uppercase tracking-widest hover:opacity-90 transition-opacity rounded disabled:opacity-50"
                  >
                    {newsletterStatus === 'loading' ? 'Joining...' : 'Subscribe'}
                  </button>
                  <div aria-live="polite">
                    {newsletterMessage && (
                      <p
                        className={`text-xs uppercase tracking-widest mt-3 ${newsletterMessageClassName}`}
                      >
                        {newsletterMessage}
                      </p>
                    )}
                  </div>
                </form>
              </div>
            </aside>
          </div>
        </section>

        {/* ── FAQ — INTERACTIVE ACCORDION ── */}
        <section
          id="faq"
          className="py-32 px-4 md:px-12 border-t border-b border-[var(--zeni-black)]/10 bg-[var(--zeni-white)] scroll-mt-28"
        >
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-16">
              <div className="md:col-span-4 reveal-up">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--zeni-green)]">
                  FAQ
                </h2>
                <p className="text-4xl md:text-5xl font-light leading-tight mt-4">
                  Answers, before
                  <br />
                  <span className="font-medium">you ask.</span>
                </p>
                <p className="text-[var(--zeni-black)]/65 mt-6 leading-relaxed font-light">
                  We keep the process clear. Here are the questions buyers and owners ask most.
                </p>
                <div className="mt-10">
                  <Link to="/register" className={CTA_LINK_CLASSES.primaryBlock}>
                    Get started →
                  </Link>
                </div>
              </div>
              <div className="md:col-span-7 md:col-start-6 reveal-up">
                <FaqAccordion faqs={FAQS} />
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
      </main>

      {/* ── FOOTER ── */}
      <footer
        id="contact"
        className="py-24 px-4 md:px-12 bg-[var(--zeni-black)] text-white scroll-mt-28"
      >
        <div className="max-w-7xl mx-auto">
          {/* Site index */}
          <div className="mb-20 pb-16 border-b border-white/10">
            <div className="[&_a]:text-white/50 [&_a:hover]:text-white [&_a]:transition-colors [&_.text-xs]:text-white/30 [&_.text-sm]:text-white/50 [&_h2]:text-white [&_p]:text-white/50">
              <SiteIndexSection />
            </div>
          </div>

          {/* Footer main */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-16">
            <div className="col-span-12 md:col-span-6">
              <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-8 text-white">
                <Link to="/" className="hover:opacity-80 transition-opacity" aria-label="Zeni Home">
                  ZENI<span className="text-[var(--zeni-green)]">.</span>
                </Link>
              </h2>
              <p className="text-lg md:text-xl font-light leading-relaxed text-white/70 max-w-sm mb-10">
                The standard for Kenyan property. Verified spaces, clear viewings.
              </p>
              {/* Social links — always shown */}
              <nav className="flex gap-4" aria-label="Social Links">
                {socialLinks.map(({ href, label, abbr, icon }) => (
                  <a
                    key={abbr}
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/50 hover:border-white/50 hover:text-white transition-all"
                  >
                    {icon}
                  </a>
                ))}
              </nav>
            </div>

            <div className="col-span-12 md:col-span-4 md:col-start-9 flex flex-col justify-end">
              <address className="space-y-4 not-italic">
                <p className="font-mono text-xs uppercase tracking-widest text-white/40 block mb-2">
                  Contact
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="block font-light text-white/70 hover:text-white transition-colors"
                >
                  {CONTACT_EMAIL}
                </a>
                {CONTACT_PHONE && (
                  <a
                    href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
                    className="block font-light text-white/70 hover:text-white transition-colors mt-1"
                  >
                    {CONTACT_PHONE}
                  </a>
                )}
              </address>

              {/* Quick links */}
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                {[
                  { label: 'Browse Map', to: MAP_EXPLORE_PATH },
                  { label: 'Sign Up', to: '/register' },
                  { label: 'Log In', to: '/login' },
                  { label: 'Agent Portal', to: '/agentlogin' },
                ].map(({ label, to }) => (
                  <Link
                    key={label}
                    to={to}
                    className="font-mono text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-24 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-4 text-xs font-mono uppercase tracking-widest text-white/30">
            <span>© 2026 ZENI. Kenya</span>
            <span>Verified · Transparent · Trusted</span>
            <span>Kenya, KE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
