import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchInsights, subscribeNewsletter, searchListings } from '../lib/api';
import type { ListingCard } from '../lib/api';
import { PropertyMap } from '../components/PropertyMap';
import { SERVICES, FAQS, MARQUEE_ITEMS, CTA_LINK_CLASSES } from './constants';
import { useAsyncEffect } from '../hooks/useAsyncEffect';
import { useMotion } from '../hooks/useMotion';
import { useKineticRing } from '../hooks/useKineticRing';
import { useCursor } from '../hooks/useCursor';
import { dedupeById, dedupeListingsByContent } from '../utils/dedupeById';
import type { Property } from '../utils/mockData';
import type { Project, InsightItem } from '../types/landing';

const MAP_FALLBACK_IMG =
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=60';

/**
 * Returns whether the given values are valid WGS84 coordinates for map display.
 * @param lat - Latitude (optional).
 * @param lng - Longitude (optional).
 * @returns true if both are finite numbers, lat in [-90, 90], lng in [-180, 180], and not (0, 0).
 * @remarks Rejects (0, 0) to avoid default/empty coordinates; map pins need real locations.
 */
function isValidCoord(lat?: number, lng?: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) {
    return false;
  }
  return true;
}

/**
 * Converts a search API listing into a Property for the map component, or null if coordinates are invalid.
 * @param listing - Raw listing from searchListings API.
 * @returns Property with id, location, price, image, etc., or null when lat/lng are missing/invalid.
 */
function listingToPropertyForMap(listing: ListingCard): Property | null {
  const lat = listing.location?.lat;
  const lng = listing.location?.lng;
  if (!isValidCoord(lat, lng)) return null;
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
    imageUrl: listing.imageUrl ?? listing.agent?.image ?? MAP_FALLBACK_IMG,
    agent: { name: listing.agent?.name ?? 'Agent', image: listing.agent?.image ?? MAP_FALLBACK_IMG },
  };
}

/** GSAP-like API used for animations (avoids depending on package export shape). */
type GsapApi = {
  to: (target: object, vars: object) => void;
  from: (target: object, vars: object) => void;
  context: (callback: () => void, scope?: object) => { revert: () => void };
  utils: { toArray: <T>(selector: string) => T[] };
  set: (target: object, vars: object) => void;
  quickTo: (target: object, prop: string, opts?: object) => (value: number) => void;
};

// --- Env (Vite: import.meta.env) ---
const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
const env = meta?.env || {};
const CONTACT_EMAIL = (env.VITE_CONTACT_EMAIL as string)?.trim() || 'zeniapp.ke@gmail.com';
const CONTACT_PHONE = (env.VITE_CONTACT_PHONE as string)?.trim() || '';
const SOCIAL_INSTAGRAM = (env.VITE_SOCIAL_INSTAGRAM as string)?.trim() || '';
const SOCIAL_LINKEDIN = (env.VITE_SOCIAL_LINKEDIN as string)?.trim() || '';
const SOCIAL_TWITTER = (env.VITE_SOCIAL_TWITTER as string)?.trim() || '';

/**
 * Formats a numeric price as a short KES string for display (e.g. "KES 25.5M", "KES 120K/mo").
 * @param price - Amount in KES.
 * @param isRental - If true, appends "/mo" and uses thousands (e.g. "120K/mo").
 * @returns Formatted string. Rental: XK/mo; >= 1M: X.XM; >= 1K: XK; else raw number.
 */
function formatKesPrice(price: number, isRental = false): string {
  if (isRental) return `KES ${(price / 1000).toFixed(0)}K/mo`;
  if (price >= 1_000_000) return `KES ${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `KES ${(price / 1_000).toFixed(0)}K`;
  return `KES ${price}`;
}

/** Newsletter API success response shape (subscribeNewsletter). */
type NewsletterApiResponse = { status: 'created' | 'exists' | 'reactivated' };

/** UI state and message to show after a successful newsletter subscription API call. */
export type NewsletterSubmissionResult = {
  status: 'success' | 'exists';
  message: string;
};

/**
 * Maps the newsletter API success response to UI status and user-facing message.
 * @param apiResponse - Success payload from subscribeNewsletter (status: created | exists | reactivated).
 * @returns { status, message } for setting newsletter state. 'exists' = already subscribed; 'success' for created/reactivated.
 */
function getNewsletterSuccessResult(apiResponse: NewsletterApiResponse): NewsletterSubmissionResult {
  if (apiResponse.status === 'exists') {
    return { status: 'exists', message: 'You are already subscribed.' };
  }
  if (apiResponse.status === 'reactivated') {
    return { status: 'success', message: 'Welcome back. You are subscribed again.' };
  }
  return { status: 'success', message: 'Thanks for joining. You are on the list.' };
}

/**
 * Derives a safe, user-facing error message from a caught newsletter subscription error.
 * @param error - Value caught in catch (may be Error, string, or other).
 * @returns Error.message when error is an Error instance; otherwise "Could not subscribe."
 */
function getNewsletterErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not subscribe.';
}

const RING_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect fill="%23f0f0f0" width="800" height="600"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-family="sans-serif" font-size="24">Zeni</text></svg>'
  );

/** Section IDs observed for nav scroll-spy. */
const NAV_SECTION_IDS = ['projects', 'neighborhoods', 'insights'] as const;

/** Scroll-spy: section is "active" when this much of it is visible. */
const SCROLL_SPY_VISIBILITY_THRESHOLD = 0.15;
/** Scroll-spy: minimum ratio to consider a section in view at all. */
const SCROLL_SPY_MIN_RATIO = 0.05;

/** Nav links that scroll to sections (Inventory, Locations, Data). */
const NAV_SECTIONS: { href: `#${string}`; label: string; sectionId: string }[] = [
  { href: '#projects', label: 'Inventory', sectionId: 'projects' },
  { href: '#neighborhoods', label: 'Locations', sectionId: 'neighborhoods' },
  { href: '#insights', label: 'Data', sectionId: 'insights' },
];

const MAP_EXPLORE_PATH = '/map';

/** Number of images shown on the kinetic ring in the hero. */
const RING_IMAGE_COUNT = 8;
/** How many map listings to fetch for the neighborhoods section. */
const MAP_LISTINGS_LIMIT = 50;
/** How many insight items to fetch for the Data section. */
const INSIGHTS_LIMIT = 3;
/** Interval (ms) for cycling the hero status text (Verified, Pending, …). */
const HERO_STATUS_CYCLE_MS = 800;
/** Scroll offset when navigating to a section (e.g. for fixed header). */
const SCROLL_OFFSET_PX = -80;

/** Labels cycled in the hero status indicator (DOM-updated via ref). */
const HERO_STATUS_LABELS = [
  'Verified', 'Pending', 'Syncing', 'Locked', 'Alert', 'Processing', 'Valuing', 'Encrypting',
];

/**
 * Maps a single API listing card to the Project shape used by the inventory table and hero ring.
 * @param item - Listing from searchListings (ListingCard; purpose may be on API shape).
 * @param index - Zero-based index; used for Project.id (display order).
 * @returns Project with title, location, type, formatted price, image. Rental detection: purpose === 'rent' or category/type contains "rent".
 */
function listingCardToProject(item: ListingCard, index: number): Project {
  const isRental =
    (item as { purpose?: string }).purpose === 'rent' ||
    String(item.category || item.type || '').toLowerCase().includes('rent');
  return {
    id: index + 1,
    listingId: item.id,
    title: item.title || 'Property',
    location: (item.location?.neighborhood || item.location?.city || 'Kenya').toUpperCase(),
    type: (item.type || item.category || 'PROPERTY').toUpperCase(),
    price: formatKesPrice(item.price, isRental),
    image: item.imageUrl || RING_PLACEHOLDER,
    alt: item.title || 'Property image',
  };
}

/**
 * Builds the hero kinetic ring image array from featured projects.
 * @param projects - Featured projects (each has an image URL).
 * @returns Array of exactly RING_IMAGE_COUNT URLs; fills missing slots with RING_PLACEHOLDER.
 */
function buildRingImagesFromProjects(projects: Project[]): string[] {
  const imageUrls = projects.map((p) => p.image).filter(Boolean);
  if (imageUrls.length >= RING_IMAGE_COUNT) {
    return imageUrls.slice(0, RING_IMAGE_COUNT);
  }
  return [...imageUrls, ...Array(RING_IMAGE_COUNT - imageUrls.length).fill(RING_PLACEHOLDER)];
}

/**
 * Fallback UI when the project list is empty or failed to load: message plus one CTA to the map.
 * @param message - Short explanation (e.g. "Unable to load listings right now.").
 * @param linkText - Button label (e.g. "Try the map", "Browse map").
 */
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

/**
 * Wraps a project row in a Link (to listing detail) when listingId is set; otherwise a plain div.
 * Ensures rows without a listing ID still render (e.g. placeholder or error state).
 */
function ProjectRowWrapper({
  project,
  children,
}: {
  project: Project;
  children: React.ReactNode;
}) {
  if (project.listingId) {
    return <Link to={`/listing/${project.listingId}`}>{children}</Link>;
  }
  return <div>{children}</div>;
}

/**
 * Zeni landing page: hero with kinetic ring, marquee, map preview, philosophy, services,
 * featured inventory, insights, FAQ, CTA, and footer. Handles scroll-spy nav, newsletter signup,
 * and GSAP scroll/magnetic animations when motion is enabled.
 */
export function ZeniLanding() {
  // --- State ---
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [insightsStatus, setInsightsStatus] = useState<'idle' | 'loading' | 'error'>('loading');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'exists'>('idle');
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const [listingStats, setListingStats] = useState<{ total: number; verified: number } | null>(null);
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([]);
  const [featuredListingsLoading, setFeaturedListingsLoading] = useState(true);
  const [featuredListingsError, setFeaturedListingsError] = useState(false);
  const [ringImages, setRingImages] = useState<string[]>(() => Array(RING_IMAGE_COUNT).fill(RING_PLACEHOLDER));
  const [mapListings, setMapListings] = useState<Property[]>([]);
  const [mapListingsLoading, setMapListingsLoading] = useState(true);
  /** Section ID in view for nav highlight; null = hero/top (Log in green). */
  const [activeNavSection, setActiveNavSection] = useState<string | null>(null);

  const navigate = useNavigate();

  // --- Refs ---
  const rootRef = useRef<HTMLDivElement>(null);
  const previewContainer = useRef<HTMLDivElement>(null);
  const previewImg = useRef<HTMLImageElement>(null);
  /** Ref for the hero status text that cycles (Verified, Pending, …). */
  const heroStatusTextRef = useRef<HTMLSpanElement>(null);

  // Custom hooks
  const { reduceMotion, coarsePointer, disableMotion, gsap, lenis, ScrollTrigger } = useMotion();
  useCursor({ enabled: false, gsap });

  // useMotion can add .cursor-hidden for a custom cursor; we keep the default cursor on the landing page
  useEffect(() => {
    const removeHidden = () => document.body.classList.remove('cursor-hidden');
    removeHidden();
    const observer = new MutationObserver(() => {
      if (document.body.classList.contains('cursor-hidden')) removeHidden();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    const intervalId = setInterval(removeHidden, 300); // fallback in case class is re-applied outside observed mutations
    return () => {
      observer.disconnect();
      clearInterval(intervalId);
      removeHidden();
    };
  }, []);

  // Scroll-spy: which section is "active" for nav highlight. Algorithm: accumulate intersection ratios
  // per section; pick the section that first exceeds SCROLL_SPY_VISIBILITY_THRESHOLD, else the one with
  // the highest ratio; then only set active if that ratio exceeds SCROLL_SPY_MIN_RATIO (avoids flicker when nothing is clearly in view).
  useEffect(() => {
    const sectionVisibilityRatios: Record<string, number> = {};
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          sectionVisibilityRatios[entry.target.id] = entry.intersectionRatio;
        });
        const sectionWithEnoughVisibility = NAV_SECTION_IDS.find(
          (id) => (sectionVisibilityRatios[id] ?? 0) > SCROLL_SPY_VISIBILITY_THRESHOLD
        ) ?? NAV_SECTION_IDS.reduce(
          (a, b) =>
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

  // Map section: fetch listings; only those with valid coordinates are shown on the map
  useAsyncEffect(async (signal) => {
    setMapListingsLoading(true);
    try {
      const res = await searchListings({ limit: MAP_LISTINGS_LIMIT });
      if (signal.cancelled) return;
      const raw = (res.items ?? []).filter((item) => !/^Zeni Support$/i.test(item.title ?? ''));
      const uniqueItems = dedupeListingsByContent(dedupeById(raw));
      const propertiesWithCoords = uniqueItems
        .map(listingToPropertyForMap)
        .filter((p): p is Property => p !== null);
      setMapListings(propertiesWithCoords);
    } catch {
      if (!signal.cancelled) setMapListings([]);
    } finally {
      if (!signal.cancelled) setMapListingsLoading(false);
    }
  }, []);

  // Kinetic ring hook
  const { stageRef, ringRef, ballRef, onPointerDown, onPointerMove, onPointerUp } = useKineticRing({
    images: ringImages,
    reduceMotion,
    gsap,
  });

  /** Scrolls to the element matching the hash (e.g. #projects). Uses Lenis if available, else native smooth scroll. */
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

  // Hero status label cycle: updates the element held by heroStatusTextRef every HERO_STATUS_CYCLE_MS. Assumes that element exists in the DOM (e.g. a span in the hero); no React state so we avoid re-renders on tick.
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

  // Fetch insights for Data section
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

  // One-time fetch: (1) total + verified counts for stats, (2) featured listings for table + hero ring. Each request is independent; failures don't block the others.
  useAsyncEffect(async (signal) => {
    setFeaturedListingsLoading(true);
    setFeaturedListingsError(false);
    const limitOne = 1;
    const limitFeatured = 6;
    try {
      const [totalCountResult, verifiedCountResult, featuredListingsResult] = await Promise.all([
        searchListings({ limit: limitOne }).catch(() => null),
        searchListings({ verifiedOnly: true, limit: limitOne }).catch(() => null),
        searchListings({ limit: limitFeatured }).catch(() => null),
      ]);
      if (signal.cancelled) return;

      setFeaturedListingsLoading(false);
      if (totalCountResult && verifiedCountResult) {
        setListingStats({
          total: totalCountResult.total ?? 0,
          verified: verifiedCountResult.total ?? 0,
        });
      }
      setFeaturedListingsError(!featuredListingsResult);
      if (featuredListingsResult?.items?.length) {
        const uniqueItems = dedupeListingsByContent(dedupeById(featuredListingsResult.items));
        const projects = uniqueItems.map((item, index) => listingCardToProject(item, index));
        setFeaturedProjects(projects);
        setRingImages(buildRingImagesFromProjects(projects));
      } else {
        setFeaturedProjects([]);
        setRingImages(Array(RING_IMAGE_COUNT).fill(RING_PLACEHOLDER));
      }
    } catch {
      if (!signal.cancelled) {
        setFeaturedListingsLoading(false);
        setFeaturedListingsError(true);
      }
    }
  }, []);

  /** Validates email, calls subscribeNewsletter, then updates status/message from getNewsletterSuccessResult or getNewsletterErrorMessage. Clears email only on success. */
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

  /** Shows or hides the floating project preview: set image and animate in, or animate out. No-op if GSAP unavailable. */
  const showProjectPreview = (imageUrl: string | null) => {
    const gsapApi = gsap as GsapApi | null;
    if (!gsapApi) return;
    if (imageUrl && previewImg.current && previewContainer.current) {
      previewImg.current.src = imageUrl;
      gsapApi.to(previewContainer.current, { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' });
    } else if (previewContainer.current) {
      gsapApi.to(previewContainer.current, { opacity: 0, scale: 0.8, duration: 0.3 });
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

  // GSAP scroll-triggered reveals: .split-text (y: 60) and .reveal-up (y: 40) animate in when they enter the viewport (start: top 85%). Scoped to rootRef so cleanup reverts all.
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
    }, rootRef);
    return () => ctx.revert();
  }, [disableMotion, gsap, ScrollTrigger]);

  // Magnetic effect: .magnetic elements translate slightly toward the cursor (offset from center * 0.3), then snap back on mouse leave. .sticking on body is used by global cursor styles.
  useEffect(() => {
    const gsapApi = gsap as GsapApi | null;
    if (disableMotion || !gsapApi) return;
    const magneticElements = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('.magnetic') ?? []);
    const cleanups: Array<() => void> = [];
    magneticElements.forEach((element) => {
      const onMouseMove = (e: MouseEvent) => {
        const rect = element.getBoundingClientRect();
        const offsetX = e.clientX - rect.left - rect.width / 2;
        const offsetY = e.clientY - rect.top - rect.height / 2;
        gsapApi.to(element, { x: offsetX * 0.3, y: offsetY * 0.3, duration: 0.3, ease: 'power2.out' });
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

  // Floating project preview tracks cursor via quickTo (smooth follow without creating new tweens every frame)
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
    { href: SOCIAL_INSTAGRAM, label: 'IG' },
    { href: SOCIAL_LINKEDIN, label: 'LI' },
    { href: SOCIAL_TWITTER, label: 'X' },
  ].filter((link): link is { href: string; label: string } => Boolean(link.href));

  return (
    <div
      ref={rootRef}
      className={`bg-[#fcfcfc] text-[#0a0a0a] font-sans selection:bg-[#0a0a0a] selection:text-white overflow-x-hidden ${disableMotion ? 'reduce-motion' : ''}`}
    >
      {/* Scoped CSS: fonts, Zeni design tokens, kinetic ring, grain overlay, scrollbar, reduced-motion */}
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
        .ring-item { position: absolute; width: 100%; height: 100%; transform-style: preserve-3d; will-change: transform, filter; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .ring-item img { backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: translateZ(0.01px); will-change: transform; }
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
      `}</style>

      {!disableMotion && <div className="grain-overlay" aria-hidden="true" />}

      {/* Fixed frames — deep green top & bottom borders, white side margins */}
      <div className="fixed top-0 left-0 w-full h-3 bg-[var(--zeni-green)] z-[60]" aria-hidden="true" />
      <div
        className="fixed bottom-0 left-0 w-full h-3 bg-[var(--zeni-green)] z-[60] flex justify-between px-6 items-center pointer-events-none"
        aria-hidden="true"
      >
        <span className="text-[11px] font-mono uppercase tracking-widest text-white/80">Kenya</span>
        <span className="text-[11px] font-mono uppercase tracking-widest text-white/80">Est. 2026 · KES</span>
      </div>
      <div className="fixed top-0 left-0 w-3 h-full bg-[var(--zeni-white)] z-[60]" aria-hidden="true" />
      <div className="fixed top-0 right-0 w-3 h-full bg-[var(--zeni-white)] z-[60]" aria-hidden="true" />

      {/* Navbar */}
      <header className="fixed top-6 left-6 right-6 z-50 py-4 px-6 flex justify-between items-center bg-[var(--zeni-white)]/90 backdrop-blur-xl shadow-sm rounded-lg border border-[var(--zeni-black)]/5">
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
              Sign up
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

      <main className="pt-32 kinetic-engine px-4 md:px-8 border-l border-r border-transparent">
        {/* Hero Section */}
        <section id="hero" className="relative min-h-[90vh] flex items-center border-b border-[var(--zeni-black)]/10 pb-20">
          <div className="w-full max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 px-4 md:px-12">
            <div className="col-span-12 md:col-span-5 z-10 flex flex-col justify-center">
              <p
                className="zeni-tagline uppercase text-[var(--zeni-green)] mb-6 md:mb-8 tracking-[0.35em] whitespace-nowrap text-[clamp(0.5rem,2vw,0.875rem)]"
                style={{ letterSpacing: '0.35em' }}
              >
                D . I . S . C . O . V . E . R . &nbsp; Y . O . U . R . &nbsp; P . L . A . C . E
              </p>
              <h1 className="zeni-display font-sans text-[clamp(2.5rem,8vw,5.5rem)] leading-[0.9] tracking-tighter text-[var(--zeni-black)] uppercase mb-6 md:mb-8">
                <span className="font-light">Where</span>{' '}
                <span className="font-bold">Kenya</span>{' '}
                <span className="font-light">Lives.</span>
              </h1>
              <p className="max-w-md text-base md:text-lg text-[var(--zeni-black)]/75 leading-relaxed mb-10 font-normal">
                We design the search experience. Verified listings, intelligent mapping, and architectural precision for
                the modern buyer.
              </p>
              <a
                href="#projects"
                onClick={(e) => onNavAnchorClick(e, '#projects')}
                className={CTA_LINK_CLASSES.orangeUnderline}
              >
                View Inventory ↓
              </a>
            </div>

            <div
              ref={stageRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              className="col-span-12 md:col-span-7 relative h-[60vh] md:h-[80vh] stage-3d flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
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
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Marquee */}
        <div className="py-5 border-y border-[var(--zeni-black)]/5 overflow-hidden bg-[var(--zeni-white)]" aria-hidden="true">
          <div className="flex gap-16 font-mono text-xs uppercase tracking-widest text-[var(--zeni-black)]/65 whitespace-nowrap animate-[marquee_25s_linear_infinite]">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].flatMap((item, i, arr) => {
              const text =
                item === 'Verified Listings' && listingStats
                  ? `${listingStats.verified.toLocaleString()} Verified Listings`
                  : item;
              const parts: React.ReactNode[] = [<span key={`t-${i}`}>{text}</span>];
              if (i < arr.length - 1) parts.push(<span key={`s-${i}`} className="zeni-orange-text">/</span>);
              return parts;
            })}
          </div>
        </div>

        {/* Map section — draw your zone, map preview card */}
        <section id="neighborhoods" className="py-32 px-4 md:px-12 border-b border-[var(--zeni-black)]/10 bg-[var(--zeni-white)] scroll-mt-28">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16 items-center">
            <div className="md:col-span-4 reveal-up">
              <h2 className="font-mono text-xs uppercase tracking-[0.2em] zeni-orange-text line-below">Map-first</h2>
              <p className="mt-6 text-4xl md:text-5xl font-light leading-tight tracking-tight text-[var(--zeni-black)]">
                Draw your zone.
                <br />
                <span className="font-medium">See what&apos;s real.</span>
              </p>
              <p className="mt-6 text-[var(--zeni-black)]/55 leading-relaxed font-light">
                Visualize price clusters, verify amenities, and ensure you&apos;re dealing with vetted agents across
                Kenya. Your search, visually verified.
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
                  <div className="mt-2 text-2xl font-light text-[var(--zeni-black)]">Kenya overview</div>
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

        {/* Philosophy */}
        <section id="about" className="py-32 px-4 md:px-12 bg-[var(--zeni-white)]">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16">
            <div className="col-span-12 md:col-span-3">
              <h2 className="font-mono text-xs uppercase tracking-widest zeni-orange-text line-below">Philosophy</h2>
            </div>
            <div className="col-span-12 md:col-span-9">
              <p className="text-3xl md:text-5xl font-light leading-tight mb-16 split-text text-[var(--zeni-black)] tracking-tight">
                Kenya's market is noisy. <br />
                <span className="font-medium">We verify reality.</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="reveal-up">
                  <p className="text-[var(--zeni-black)]/55 leading-relaxed mb-8 font-light">
                    Every agent is vetted. Every title deed verified. Every viewing tracked. We don't just list
                    properties—we curate confidence for Kenyan buyers, renters, and owners.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="border-t border-[var(--zeni-black)]/5 bg-[var(--zeni-white)]">
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
                <p className="text-[var(--zeni-black)]/55 leading-relaxed max-w-sm font-light text-sm">{service.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Projects */}
        <section
          id="projects"
          className="py-32 px-4 md:px-12 border-b border-[var(--zeni-black)]/10 bg-[var(--zeni-white)] scroll-mt-28"
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
                <MapFallbackBlock message="Unable to load listings right now." linkText="Try the map" />
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
                  Explore Map
                </Link>
              </div>
            )}
          </div>
        </section>

        <div
          ref={previewContainer}
          className="fixed top-0 left-0 w-[320px] h-[220px] z-50 pointer-events-none opacity-0 overflow-hidden border border-[var(--zeni-black)]/10 bg-[var(--zeni-white)] hidden md:block"
          aria-hidden="true"
        >
          <img ref={previewImg} src="" alt="Project Preview" className="w-full h-full object-cover" />
        </div>

        {/* Insights */}
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
                  <div className="text-sm text-[var(--zeni-black)]/55 font-light">No insights this week.</div>
                )}
                {insights.map((insight) => (
                  <article key={insight.title + (insight.id ?? '')} className="border-b border-[var(--zeni-black)]/5 py-8 group">
                    <div className="text-xs font-mono uppercase tracking-widest text-[var(--zeni-green)] mb-3">
                      {insight.tag}
                    </div>
                    <h3 className="text-xl font-medium mb-3 text-[var(--zeni-black)]">{insight.title}</h3>
                    <p className="text-sm text-[var(--zeni-black)]/55 leading-relaxed font-light">{insight.desc}</p>
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
                <p className="text-2xl font-light text-[var(--zeni-black)]">The Kenya market note.</p>
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
                      <p className={`text-xs uppercase tracking-widest mt-3 ${newsletterMessageClassName}`}>
                        {newsletterMessage}
                      </p>
                    )}
                  </div>
                </form>
              </div>
            </aside>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-32 px-4 md:px-12 border-b border-[var(--zeni-black)]/10 bg-[var(--zeni-white)] scroll-mt-28">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--zeni-green)]">FAQ</h2>
                <p className="text-4xl md:text-5xl font-light leading-tight mt-4">
                  Answers, before
                  <br />
                  <span className="font-medium">you ask.</span>
                </p>
              </div>
              <p className="text-[var(--zeni-black)]/65 max-w-xl">
                We keep the process clear. Here are the questions buyers and owners ask most.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {FAQS.map((faq) => (
                <article key={faq.q} className="border border-[var(--zeni-black)]/10 bg-[var(--zeni-white)] p-6">
                  <h3 className="text-lg font-light mb-3 text-[var(--zeni-black)]">{faq.q}</h3>
                  <p className="text-sm text-[var(--zeni-black)]/65 leading-relaxed">{faq.a}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 md:px-12 border-b border-[var(--zeni-black)]/10 bg-[var(--zeni-white)]">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-10">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--zeni-green)]">Start now</h2>
              <p className="text-4xl md:text-5xl font-light leading-tight mt-4">
                Ready to list or
                <br />
                <span className="font-medium">find your next place?</span>
              </p>
              <p className="text-[var(--zeni-black)]/65 mt-4 max-w-xl">
                Zeni brings verified listings across Kenya, clear KES data, and safe viewings into one trusted
                platform.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to={MAP_EXPLORE_PATH} className={CTA_LINK_CLASSES.outlineLg}>
                Browse the map
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="contact" className="py-24 px-4 md:px-12 bg-[var(--zeni-black)] text-white scroll-mt-28">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16">
          <div className="col-span-12 md:col-span-6">
            <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-8 text-white">
              <Link to="/" className="hover:opacity-80 transition-opacity" aria-label="Zeni Home">
                ZENI<span className="text-[var(--zeni-green)]">.</span>
              </Link>
            </h2>
            <p className="text-lg md:text-xl font-light leading-relaxed text-white/70 max-w-sm mb-10">
              The standard for Kenyan property. Verified spaces, clear viewings.
            </p>
            <nav className="flex gap-6 font-mono text-xs uppercase tracking-widest text-white/60" aria-label="Social Links">
              {socialLinks.map(({ href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  {label}
                </a>
              ))}
            </nav>
          </div>

          <div className="col-span-12 md:col-span-4 md:col-start-9 flex flex-col justify-end">
            <address className="space-y-4 not-italic">
              <p className="font-mono text-xs uppercase tracking-widest text-white/60 block mb-2">Contact</p>
              <a href={`mailto:${CONTACT_EMAIL}`} className="block font-light text-white/80 hover:text-white transition-colors">
                {CONTACT_EMAIL}
              </a>
              {CONTACT_PHONE && (
                <a
                  href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
                  className="block font-light text-white/80 hover:text-white transition-colors mt-1"
                >
                  {CONTACT_PHONE}
                </a>
              )}
            </address>
          </div>
        </div>

        <div className="mt-24 pt-8 border-t border-white/10 flex justify-between text-xs font-mono uppercase tracking-widest text-white/50">
          <span>© 2026 ZENI. Kenya</span>
          <span>Kenya, KE</span>
        </div>
      </footer>
    </div>
  );
}
