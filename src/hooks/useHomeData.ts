import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  searchListings,
  fetchListing,
  fetchMyViewings,
  fetchRecommendations,
  fetchSavedListings,
  toggleSaveListing,
  createViewingRequest,
} from '../lib/api';
import type { ListingCard } from '../lib/api';
import { useChat } from '../context/ChatContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthProvider';
import { useNotifications } from '../context/NotificationContext';
import { logger } from '../lib/logger';
import { errors as errMsg, success as successMsg } from '../constants/messages';
import { dedupeById, dedupeListingsByContent } from '../utils/dedupeById';
import type { Property } from '../utils/mockData';
import type { ActivityItem } from '../pages/user/home/ActivityFeed';
import {
  resolveUserContactLabel,
  getAgentOtherPartyKey,
  getAdminOtherPartyKey,
} from '../pages/messages/contactLabels';
import type { Conversation } from '../types/chat';

type PropertyWithMeta = Property & { saved?: boolean };
type ConversationWithOtherParty = Conversation & { otherParty?: { name?: string } };

type Viewing = {
  _id: string;
  listingId: string;
  agentId: string;
  date: string;
  note?: string;
  status: string;
  createdAt: string;
};

function mapToProperty(listing: ListingCard): PropertyWithMeta {
  return {
    id: listing.id,
    title: listing.title,
    category: listing.category,
    description: listing.description,
    price: listing.price,
    currency: listing.currency ?? 'KES',
    purpose: 'rent',
    type: (listing.type as Property['type']) || 'Apartment',
    agentId: listing.agent?.id,
    location: {
      neighborhood: listing.location?.neighborhood ?? '',
      city: listing.location?.city ?? '',
      lat: listing.location?.lat ?? 0,
      lng: listing.location?.lng ?? 0,
    },
    features: {
      bedrooms: listing.beds ?? 0,
      bathrooms: listing.baths ?? 0,
      sqm: listing.sqm ?? 0,
    },
    amenities: listing.amenities,
    isVerified: Boolean(listing.verified),
    imageUrl:
      listing.imageUrl ||
      listing?.agent?.image ||
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80',
    agent: {
      name: listing.agent?.name ?? 'Agent',
      image: listing.agent?.image ?? '',
    },
    saved: listing.saved,
  };
}

/**
 * Custom hook that encapsulates all data fetching and derived state for the Home page.
 * Keeps the component clean and focused on rendering.
 */
export function useHomeData() {
  const { user } = useAuth();
  const { push } = useToast();
  const { startConversation, setActiveConversation, conversations, messages } = useChat();
  const { notifications } = useNotifications();
  const role = user?.role;

  const [items, setItems] = useState<PropertyWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PropertyWithMeta | null>(null);
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [nextViewingListing, setNextViewingListing] = useState<ListingCard | null>(null);
  const [recommendations, setRecommendations] = useState<PropertyWithMeta[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [savedItems, setSavedItems] = useState<PropertyWithMeta[]>([]);

  // Deduplicate conversations by the visible other party so counts/feed don't double up.
  const dedupedConversations = useMemo(() => {
    const map = new Map<string, Conversation>();
    const sorted = [...conversations].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
    sorted.forEach((c) => {
      let key = c.id;
      if (role === 'user') {
        key = resolveUserContactLabel(c.agentSnapshot?.name);
      } else if (role === 'agent') {
        key = getAgentOtherPartyKey(c);
      } else if (role === 'admin') {
        key = getAdminOtherPartyKey(c);
      }
      if (!map.has(key)) map.set(key, c);
    });
    return Array.from(map.values());
  }, [conversations, role]);

  const fetchAll = useCallback(async (silent = false, signal?: AbortSignal) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const listingsPromise = searchListings({ limit: 8, verifiedOnly: true }, { signal });
      const viewingsPromise = fetchMyViewings({ signal });
      const recsPromise = fetchRecommendations({ signal });
      const savedPromise = fetchSavedListings({ signal });
      const [listingsResult, viewingsResult, recsResult, savedResult] = await Promise.allSettled([
        listingsPromise,
        viewingsPromise,
        recsPromise,
        savedPromise,
      ]);

      if (signal?.aborted) return;

      if (listingsResult.status === 'fulfilled') {
        const raw = listingsResult.value.items ?? [];
        const unique = dedupeListingsByContent(dedupeById(raw));
        setItems(unique.map(mapToProperty));
      }

      if (viewingsResult.status === 'fulfilled') {
        setViewings((viewingsResult.value as Viewing[]) ?? []);
      }

      if (recsResult.status === 'fulfilled') {
        const raw = recsResult.value.items ?? [];
        const unique = dedupeListingsByContent(dedupeById(raw));
        setRecommendations(unique.map(mapToProperty));
      }

      if (savedResult.status === 'fulfilled') {
        const raw = savedResult.value.items ?? [];
        const unique = dedupeListingsByContent(dedupeById(raw));
        setSavedItems(unique.map(mapToProperty));
      }

      setLastUpdated(new Date());
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Parallel data fetching — fire all requests at once, abort on unmount
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    fetchAll(false, signal);

    return () => {
      controller.abort();
    };
  }, [fetchAll]);

  // Lightweight polling for live feel
  useEffect(() => {
    const controller = new AbortController();
    const id = window.setInterval(() => {
      fetchAll(true, controller.signal);
    }, 15_000);
    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, [fetchAll]);

  // Upcoming viewings
  const upcomingViewings = useMemo(() => {
    return viewings
      .filter((v) => new Date(v.date).getTime() >= Date.now())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [viewings]);

  // Fetch next viewing's listing detail (with abort on cleanup)
  useEffect(() => {
    const next = upcomingViewings[0];
    if (!next) {
      setNextViewingListing(null);
      return;
    }
    const controller = new AbortController();
    fetchListing(next.listingId, { signal: controller.signal })
      .then((listing) => {
        if (!controller.signal.aborted) setNextViewingListing(listing);
      })
      .catch(() => {
        if (!controller.signal.aborted) setNextViewingListing(null);
      });
    return () => {
      controller.abort();
    };
  }, [upcomingViewings]);

  // Fetch selected listing detail (with abort on cleanup)
  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    const inList =
      items.find((p) => p.id === selectedId) ?? recommendations.find((p) => p.id === selectedId);
    if (inList) {
      setSelectedDetail(inList);
      return;
    }
    const controller = new AbortController();
    fetchListing(selectedId, { signal: controller.signal })
      .then(mapToProperty)
      .then((detail) => {
        if (!controller.signal.aborted) setSelectedDetail(detail);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSelectedDetail(null);
      });
    return () => {
      controller.abort();
    };
  }, [selectedId, items, recommendations]);

  // Derived user display info
  const displayName =
    user?.name
      ?.trim()
      ?.replace(/^buyer\s+/i, '')
      ?.split(/\s+/)[0] ?? 'there';
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';

  // Derived stats
  const verifiedCount = useMemo(() => items.filter((p) => p.isVerified).length, [items]);
  const savedCount = useMemo(() => savedItems.length, [savedItems]);
  const averagePrice = useMemo(() => {
    if (!items.length) return null;
    const total = items.reduce((sum, p) => sum + (p.price || 0), 0);
    return Math.round(total / items.length);
  }, [items]);
  const topNeighborhood = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      const key = item.location?.neighborhood || item.location?.city || '';
      if (key) counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Kenya';
  }, [items]);

  // Activity feed
  const activityFeed = useMemo((): ActivityItem[] => {
    const out: ActivityItem[] = [];
    notifications.slice(0, 5).forEach((n) => {
      out.push({
        id: n.id,
        title: n.title,
        desc: n.description ?? '',
        time: new Date(n.createdAt).toLocaleString(),
        type: 'notification',
      });
    });
    dedupedConversations
      .slice(0, 3)
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      .forEach((conv) => {
        const list = messages[conv.id] ?? [];
        const last = list[list.length - 1];
        const content =
          last && typeof (last as { content?: string }).content === 'string'
            ? (last as { content: string }).content
            : 'New message';
        const withOtherParty = conv as ConversationWithOtherParty;
        const otherName =
          withOtherParty.otherParty?.name ||
          conv.agentSnapshot?.name ||
          conv.userSnapshot?.name ||
          'Agent';
        out.push({
          id: conv.id,
          title: otherName,
          desc: content.slice(0, 60) + (content.length > 60 ? '...' : ''),
          time: new Date(conv.lastMessageAt).toLocaleString(),
          type: 'message',
          href: `/app/messages/${conv.id}`,
        });
      });
    out.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const deduped: ActivityItem[] = [];
    const seen = new Set<string>();
    out.forEach((item) => {
      const key = `${item.type}:${item.title}`;
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(item);
    });

    return deduped.slice(0, 5);
  }, [notifications, dedupedConversations, messages]);

  // Action handlers
  const handleSaveToggle = async (id: string) => {
    try {
      const res = await toggleSaveListing(id);
      setItems((prev) => prev.map((p) => (p.id === id ? { ...p, saved: res.saved } : p)));
      setRecommendations((prev) => prev.map((p) => (p.id === id ? { ...p, saved: res.saved } : p)));
      if (selectedDetail?.id === id) setSelectedDetail({ ...selectedDetail, saved: res.saved });
    } catch (e) {
      logger.warn('Save toggle failed', { id }, e instanceof Error ? e : undefined);
    }
  };

  const handleViewing = async (payload: { date: string; note?: string }) => {
    const target = selectedDetail;
    if (!target?.agentId) {
      push({ title: 'Missing agent', description: errMsg.auth.cannotSendViewing, tone: 'error' });
      return;
    }
    try {
      const response = await createViewingRequest({
        listingId: target.id,
        agentId: target.agentId,
        date: payload.date,
        note: payload.note,
      });
      const viewingId = response._id || (response as { id?: string }).id;
      if (response.needsViewingFee && response.viewingFeeAmount && viewingId) {
        push({
          title: 'Pay viewing fee',
          description: `KES ${response.viewingFeeAmount} secures your viewing. You'll be redirected to pay.`,
          tone: 'success',
        });
        const params = new URLSearchParams({
          purpose: 'viewing_fee',
          referenceId: String(viewingId),
          amount: String(response.viewingFeeAmount),
        });
        window.location.href = `/pay/payments?${params.toString()}`;
      } else {
        push({ title: 'Viewing requested', description: successMsg.viewingShort, tone: 'success' });
      }
    } catch {
      push({ title: 'Failed', description: errMsg.request.viewing, tone: 'error' });
    }
  };

  const handleMessage = async (property: PropertyWithMeta, navigate: (path: string) => void) => {
    if (!property?.agentId) {
      push({ title: 'Missing agent', description: errMsg.auth.missingAgent, tone: 'error' });
      return;
    }
    try {
      const conv = await startConversation(property.id, property.agentId);
      setActiveConversation(conv.id);
      navigate(`/app/messages/${conv.id}`);
    } catch {
      push({ title: 'Failed', description: errMsg.auth.cannotStartChat, tone: 'error' });
    }
  };

  const handleShare = async (property: PropertyWithMeta) => {
    const url = `${window.location.origin}/listing/${property.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: property?.title ?? 'Listing',
          text: 'Check out this listing',
          url,
        });
        return;
      } catch {
        /* ignore */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      push({ title: 'Link copied', description: successMsg.linkCopied, tone: 'success' });
    } catch {
      push({ title: 'Share failed', description: errMsg.share.failed, tone: 'error' });
    }
  };

  return {
    // State
    items,
    loading,
    refreshing,
    lastUpdated,
    selectedId,
    setSelectedId,
    selectedDetail,
    viewings,
    nextViewingListing,
    recommendations,
    upcomingViewings,
    // Derived
    displayName,
    timeGreeting,
    verifiedCount,
    savedCount,
    averagePrice,
    topNeighborhood,
    activityFeed,
    hero: items[0],
    nextViewing: upcomingViewings[0],
    newMatch: recommendations[0],
    activeUpdates: activityFeed.length,
    newMatchesCount: recommendations.length,
    // Actions
    handleSaveToggle,
    handleViewing,
    handleMessage,
    handleShare,
  };
}
