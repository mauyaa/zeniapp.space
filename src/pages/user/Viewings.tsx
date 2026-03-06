import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  MessageCircle,
  MapPin,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  fetchListing,
  fetchMyViewings,
  confirmViewingCompleted,
  type ListingCard,
} from '../../lib/api';
import { listingThumbUrl } from '../../lib/cloudinary';
import { formatCompactPrice } from '../../lib/format';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../context/I18nContext';
import { cn } from '../../utils/cn';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCardRow } from '../../components/ui/Skeleton';
import { PageTransition } from '../../components/ui/PageTransition';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { StatsBar } from '../../components/ui/StatsBar';
import { Button } from '../../components/ui/Button';

const fallbackImage =
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=60';

type Viewing = {
  _id: string;
  listingId: string;
  agentId: string;
  date: string;
  note?: string;
  status: 'requested' | 'confirmed' | 'declined' | 'completed' | 'canceled' | 'no_show';
  viewingFeeAmount?: number;
  viewingFeeStatus?: 'pending_payment' | 'held' | 'released';
  tenantConfirmedAt?: string;
  createdAt: string;
};

type TabKey = 'all' | 'upcoming' | 'confirmed' | 'declined';

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'All', icon: CalendarClock },
  { key: 'upcoming', label: 'Upcoming', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'declined', label: 'Declined', icon: XCircle },
];

const statusConfig: Record<
  string,
  { bg: string; text: string; border: string; dot: string; label: string }
> = {
  confirmed: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Confirmed',
  },
  completed: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    dot: 'bg-sky-500',
    label: 'Completed',
  },
  declined: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    label: 'Declined',
  },
  canceled: {
    bg: 'bg-zinc-100',
    text: 'text-zinc-600',
    border: 'border-zinc-200',
    dot: 'bg-zinc-400',
    label: 'Canceled',
  },
  no_show: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    label: 'No show',
  },
  requested: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    label: 'Pending',
  },
};

export function ViewingsPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const { t } = useI18n();
  const { startConversation, setActiveConversation } = useChat();
  const [items, setItems] = useState<Viewing[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingMap, setListingMap] = useState<Record<string, ListingCard>>({});
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMyViewings();
      setItems((data as Viewing[]) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const missingIds = Array.from(new Set(items.map((v) => v.listingId))).filter(
      (id) => !listingMap[id]
    );
    if (missingIds.length === 0) return;
    let cancelled = false;
    Promise.all(
      missingIds.map((id) =>
        fetchListing(id)
          .then((listing) => ({ id, listing }))
          .catch(() => null)
      )
    ).then((results) => {
      if (cancelled) return;
      setListingMap((prev) => {
        const next = { ...prev };
        results.forEach((res) => {
          if (res) next[res.id] = res.listing;
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [items, listingMap]);

  const upcomingCount = useMemo(
    () => items.filter((v) => new Date(v.date).getTime() > Date.now()).length,
    [items]
  );
  const confirmedCount = useMemo(
    () => items.filter((v) => v.status === 'confirmed').length,
    [items]
  );
  const declinedCount = useMemo(() => items.filter((v) => v.status === 'declined').length, [items]);

  const filteredItems = useMemo(() => {
    const now = Date.now();
    switch (activeTab) {
      case 'upcoming':
        return items.filter((v) => new Date(v.date).getTime() > now);
      case 'confirmed':
        return items.filter((v) => v.status === 'confirmed');
      case 'declined':
        return items.filter((v) => v.status === 'declined');
      default:
        return items;
    }
  }, [items, activeTab]);

  const tabCounts: Record<TabKey, number> = {
    all: items.length,
    upcoming: upcomingCount,
    confirmed: confirmedCount,
    declined: declinedCount,
  };

  const handleMessageAgent = async (viewing: Viewing) => {
    try {
      const conv = await startConversation(viewing.listingId, viewing.agentId);
      setActiveConversation(conv.id);
      navigate(`/app/messages/${conv.id}`);
    } catch {
      // ignore
    }
  };

  const handleConfirmCompleted = async (viewingId: string) => {
    try {
      await confirmViewingCompleted(viewingId);
      setItems((prev) =>
        prev.map((v) =>
          v._id === viewingId
            ? {
                ...v,
                viewingFeeStatus: 'released' as const,
                tenantConfirmedAt: new Date().toISOString(),
              }
            : v
        )
      );
      push({
        title: 'Viewing confirmed',
        description: 'The viewing fee has been released to the agent.',
        tone: 'success',
      });
    } catch {
      push({ title: 'Could not confirm', description: 'Please try again.', tone: 'error' });
    }
  };

  const formatViewingDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today at ${time}`;
    if (isTomorrow) return `Tomorrow at ${time}`;
    return `${date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${time}`;
  };

  return (
    <PageTransition className="space-y-8">
      {/* Header */}
      <SectionHeader
        eyebrow="Schedule"
        title={t('viewings.title')}
        subtitle={t('viewings.subtitle')}
        actions={
          <Button
            variant="zeni-primary"
            size="zeni-md"
            onClick={() => navigate('/app/explore')}
            leftIcon={<CalendarClock className="w-3.5 h-3.5" />}
          >
            {t('viewings.bookViewing')}
          </Button>
        }
      >
        <StatsBar
          variant="zeni"
          loading={loading}
          items={[
            { label: 'Total', value: String(items.length) },
            { label: 'Upcoming', value: String(upcomingCount), dot: 'bg-blue-500' },
            { label: 'Confirmed', value: String(confirmedCount), dot: 'bg-green-500' },
            { label: 'Declined', value: String(declinedCount), muted: declinedCount === 0 },
          ]}
        />
      </SectionHeader>

      {/* Tab navigation */}
      <div
        className="flex items-center gap-1 p-1 bg-zinc-50 border border-zinc-200 rounded-xl w-fit"
        role="tablist"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const count = tabCounts[tab.key];
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all',
                isActive
                  ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 border border-transparent'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              <span
                className={cn(
                  'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                  isActive ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-600'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCardRow key={i} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          variant="light"
          size="lg"
          illustration="calendar"
          title={activeTab === 'all' ? t('viewings.noViewings') : `No ${activeTab} viewings`}
          subtitle={
            activeTab === 'all'
              ? 'Request a viewing from a property page; agents will confirm or suggest another time.'
              : 'Try switching to "All" to see your complete schedule.'
          }
          action={
            activeTab === 'all'
              ? {
                  label: 'Explore listings',
                  onClick: () => navigate('/app/explore'),
                  variant: 'primary' as const,
                }
              : {
                  label: 'Show all',
                  onClick: () => setActiveTab('all'),
                  variant: 'primary' as const,
                }
          }
        />
      ) : (
        <motion.div
          className="space-y-3"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        >
          {filteredItems.map((v) => {
            const listing = listingMap[v.listingId];
            const config = statusConfig[v.status] ?? statusConfig.requested;
            const isPast = new Date(v.date).getTime() < Date.now();
            const canConfirmCompleted = v.status === 'completed' && v.viewingFeeStatus === 'held';

            return (
              <motion.div
                key={v._id}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-300 transition-colors',
                  isPast && 'opacity-70'
                )}
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Image */}
                  <div className="relative sm:w-44 flex-shrink-0">
                    <img
                      src={listingThumbUrl(listing?.imageUrl) || fallbackImage}
                      alt={listing?.title || 'Listing'}
                      className="h-32 sm:h-full w-full object-cover"
                    />
                    <div
                      className={cn(
                        'absolute top-3 left-3 flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
                        config.bg,
                        config.text,
                        config.border
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
                      {config.label}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-serif font-semibold text-zinc-900 truncate">
                        {listing?.title || `Listing ${v.listingId.slice(0, 8)}`}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {listing?.location?.neighborhood || 'Neighborhood'}
                          {listing?.location?.city ? `, ${listing.location.city}` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-2.5">
                        <span className="font-mono text-sm font-semibold text-zinc-900">
                          {formatCompactPrice(listing?.price, listing?.currency || 'KES')}
                          {(listing?.purpose === 'rent' ||
                            (listing?.category || '').toLowerCase().includes('rent')) &&
                            ' per month'}
                        </span>
                        <span className="text-zinc-300">|</span>
                        <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                          <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                          {formatViewingDate(v.date)}
                        </span>
                      </div>

                      {v.note && (
                        <p className="mt-2 text-xs text-zinc-500 bg-zinc-50 rounded-lg px-3 py-1.5 inline-block">
                          {v.note}
                        </p>
                      )}

                      {v.viewingFeeAmount != null && (
                        <p className="mt-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                          {v.viewingFeeStatus === 'released'
                            ? `Fee released · KES ${v.viewingFeeAmount}`
                            : v.viewingFeeStatus === 'held'
                              ? `Fee held · KES ${v.viewingFeeAmount}`
                              : v.viewingFeeStatus === 'pending_payment'
                                ? `Pay KES ${v.viewingFeeAmount} to secure`
                                : `Viewing fee KES ${v.viewingFeeAmount}`}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      {canConfirmCompleted && (
                        <Button
                          variant="zeni-primary"
                          size="zeni-sm"
                          onClick={() => handleConfirmCompleted(v._id)}
                          leftIcon={<CheckCircle2 className="w-3 h-3" />}
                          aria-label={t('viewings.confirmCompleted')}
                        >
                          {t('viewings.confirmCompleted')}
                        </Button>
                      )}
                      <Button
                        variant="zeni-secondary"
                        size="zeni-sm"
                        onClick={() => navigate(`/app/explore?listing=${v.listingId}`)}
                        leftIcon={<ExternalLink className="w-3 h-3" />}
                      >
                        View listing
                      </Button>
                      <Button
                        variant="zeni-primary"
                        size="zeni-sm"
                        onClick={() => handleMessageAgent(v)}
                        leftIcon={<MessageCircle className="w-3 h-3" />}
                      >
                        Message
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </PageTransition>
  );
}
