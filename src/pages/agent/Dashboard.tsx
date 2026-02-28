import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Clock,
  Eye,
  Heart,
  Inbox,
  ListChecks,
  MessageCircle,
  MoreHorizontal,
  Plus,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { fetchAgentStats, fetchAgentListings, type AgentListing } from '../../lib/api';
import { useChat } from '../../context/ChatContext';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { errors } from '../../constants/messages';

type AgentKpiTone = 'emerald' | 'blue' | 'amber' | 'rose' | 'purple' | 'slate';
type AgentKpi = { label: string; value: string | number; tone: AgentKpiTone };
type AgentPipeline = { stage: string; count: number };
type AgentInsight = { label: string; value: string | number; hint?: string };
type AgentStatsResponse = { kpis?: AgentKpi[]; pipeline?: AgentPipeline[]; insights?: AgentInsight[]; listings?: number };

const pipelineColors: Record<string, string> = {
  New: 'bg-slate-900',
  Contacted: 'bg-blue-600',
  Viewing: 'bg-amber-500',
  Offer: 'bg-emerald-600',
  Closed: 'bg-violet-600',
};

const kpiIcons: Record<string, React.ElementType> = {
  'New Leads': Users,
  'Pending Viewings': Clock,
  'Active Listings': ListChecks,
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { conversations } = useChat();
  const { push } = useToast();
  const [stats, setStats] = useState<AgentStatsResponse | null>(null);
  const [listings, setListings] = useState<AgentListing[]>([]);

  useEffect(() => {
    fetchAgentStats()
      .then((data) => setStats(data as AgentStatsResponse))
      .catch((err) => {
        logger.error('Failed to load agent stats', {}, err instanceof Error ? err : undefined);
        push({ title: 'Load failed', description: errors.generic, tone: 'error' });
      });
  }, [push]);

  useEffect(() => {
    fetchAgentListings()
      .then(setListings)
      .catch(() => setListings([]));
  }, []);

  const kpis: AgentKpi[] = stats?.kpis || [
    { label: 'New Leads', value: '-', tone: 'emerald' },
    { label: 'Pending Viewings', value: '-', tone: 'amber' },
    { label: 'Active Listings', value: '-', tone: 'purple' }
  ];

  const pipeline: AgentPipeline[] = stats?.pipeline || [
    { stage: 'New', count: 0 },
    { stage: 'Contacted', count: 0 },
    { stage: 'Viewing', count: 0 },
    { stage: 'Offer', count: 0 },
    { stage: 'Closed', count: 0 }
  ];

  const totalListings = typeof stats?.listings === 'number' ? stats.listings : listings.length;
  const activeLeads = (pipeline.reduce((s, p) => s + p.count, 0) || (kpis.find((k) => k.label === 'New Leads')?.value as number)) ?? 0;
  const totalViews = useMemo(() => {
    const insight = (stats as AgentStatsResponse)?.insights?.find((i) => /view|impression/i.test(String(i.label)));
    return insight?.value ?? '2.4k';
  }, [stats]);

  const leadConversations = useMemo(
    () => conversations.filter((conv) => conv.userSnapshot?.role !== 'admin'),
    [conversations]
  );

  const nextActions = useMemo(() => {
    const sorted = [...leadConversations].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
    return sorted.slice(0, 5).map((conv) => {
      const buyerName = conv.userSnapshot?.name || `Buyer ${conv.userId?.slice(-4) || ''}`.trim();
      const listingTitle = conv.listingSnapshot?.title;
      const hasUnread = conv.unreadCount > 0;
      const timeAgo = getTimeAgo(conv.lastMessageAt);
      return {
        id: conv.id,
        name: buyerName,
        listing: listingTitle || 'General inquiry',
        hasUnread,
        timeAgo,
        cta: hasUnread ? 'Reply' : 'Open',
        onClick: () => navigate(`/agent/messages/${conv.id}`)
      };
    });
  }, [leadConversations, navigate]);

  const unreadCount = useMemo(
    () => leadConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [leadConversations]
  );

  const slaMinutes = useMemo(() => {
    const dueTimes = leadConversations
      .filter((c) => c.responseDueAt && c.unreadCount > 0)
      .map((c) => new Date(c.responseDueAt as string).getTime() - Date.now())
      .filter((ms) => ms > 0);
    if (!dueTimes.length) return null;
    return Math.round(Math.min(...dueTimes) / 60000);
  }, [leadConversations]);

  const [portfolioTab, setPortfolioTab] = useState<'active' | 'drafts' | 'sold'>('active');
  const activeListings = useMemo(
    () => listings.filter((l) => l.status !== 'draft' && l.availabilityStatus !== 'sold' && l.availabilityStatus !== 'let'),
    [listings]
  );
  const draftListings = useMemo(() => listings.filter((l) => l.status === 'draft'), [listings]);
  const soldListings = useMemo(() => listings.filter((l) => l.availabilityStatus === 'sold' || l.availabilityStatus === 'let'), [listings]);
  const portfolioList = portfolioTab === 'active' ? activeListings : portfolioTab === 'drafts' ? draftListings : soldListings;

  return (
    <div className="space-y-10">
      {/* Stats row: 3 white cards + 1 black CTA (HTML design) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-1 md:col-span-3 grid grid-cols-3 gap-0">
          <div className="bg-white p-6 border border-gray-200">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Total Listings</p>
            <div className="flex items-end justify-between">
              <h4 className="text-3xl font-serif text-black">{totalListings}</h4>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-sm">+2</span>
            </div>
          </div>
          <div className="bg-white p-6 border border-gray-200 border-l-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Active Leads</p>
            <div className="flex items-end justify-between">
              <h4 className="text-3xl font-serif text-black">{activeLeads}</h4>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-sm">+12%</span>
            </div>
          </div>
          <div className="bg-white p-6 border border-gray-200 border-l-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Total Views</p>
            <div className="flex items-end justify-between">
              <h4 className="text-3xl font-serif text-black">{totalViews}</h4>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-sm">+8%</span>
            </div>
          </div>
        </div>
        <div className="bg-black text-white p-6 flex flex-col justify-center items-start border border-black">
          <h3 className="font-serif text-xl mb-2">Boost your reach</h3>
          <p className="text-xs text-zinc-400 mb-4">Promote your listings to top-tier tenants.</p>
          <button
            type="button"
            onClick={() => navigate('/agent/boost')}
            className="text-[10px] font-bold uppercase tracking-widest border-b border-white pb-1 hover:text-gray-300 hover:border-gray-300 transition-colors"
          >
            Start Campaign
          </button>
        </div>
      </div>

      {/* My Portfolio — tabs + listing cards */}
      <div>
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-serif font-medium text-black">My Portfolio</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPortfolioTab('active')}
              className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors ${
                portfolioTab === 'active'
                  ? 'bg-white border border-gray-200 text-black'
                  : 'bg-transparent border border-transparent text-gray-400 hover:text-black'
              }`}
            >
              Active ({activeListings.length})
            </button>
            <button
              type="button"
              onClick={() => setPortfolioTab('drafts')}
              className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors ${
                portfolioTab === 'drafts'
                  ? 'bg-white border border-gray-200 text-black'
                  : 'bg-transparent border border-transparent text-gray-400 hover:text-black'
              }`}
            >
              Drafts ({draftListings.length})
            </button>
            <button
              type="button"
              onClick={() => setPortfolioTab('sold')}
              className={`px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors ${
                portfolioTab === 'sold'
                  ? 'bg-white border border-gray-200 text-black'
                  : 'bg-transparent border border-transparent text-gray-400 hover:text-black'
              }`}
            >
              Sold ({soldListings.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {portfolioList.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <EmptyState
                variant="light"
                title={portfolioTab === 'active' ? 'No active listings' : portfolioTab === 'drafts' ? 'No drafts' : 'No sold listings'}
                subtitle={portfolioTab === 'active' ? 'Create a listing to get started.' : 'Nothing in this tab yet.'}
                action={portfolioTab === 'active' ? { label: 'Create listing', onClick: () => navigate('/agent/listings/new') } : undefined}
              />
            </div>
          ) : (
            portfolioList.slice(0, 6).map((listing) => (
              <ListingPortfolioCard key={listing._id} listing={listing} onManage={() => navigate(`/agent/listings/${listing._id}/edit`)} />
            ))
          )}
        </div>
        {portfolioList.length > 0 && (
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" onClick={() => navigate('/agent/listings')}>
              View all listings <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Command bar — compact */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-gray-400 mb-1">Command center</p>
            <h3 className="text-base font-semibold text-black">Today&apos;s overview</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              slaMinutes !== null && slaMinutes < 15 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-gray-200 bg-gray-50 text-gray-600'
            }`}>
              <Zap className="h-3.5 w-3.5" />
              SLA: {slaMinutes !== null ? `${slaMinutes}m` : 'All clear'}
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/agent/messages')}>
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              Messages {unreadCount > 0 && <Badge tone="rose" className="ml-1.5">{unreadCount}</Badge>}
            </Button>
            <Button size="sm" onClick={() => navigate('/agent/listings/new')}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New listing
            </Button>
          </div>
        </div>
      </div>

      {/* Next actions + Pipeline */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4 border border-gray-200 bg-white rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Priority</p>
              <p className="text-base font-semibold text-black">Conversations to answer</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => navigate('/agent/messages')}>
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          {nextActions.length === 0 ? (
            <EmptyState
              variant="light"
              title="No active chats yet"
              subtitle="When buyers message you about a listing, conversations will appear here."
            />
          ) : (
            <div className="space-y-2">
              {nextActions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={a.onClick}
                  className="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left hover:bg-gray-100 hover:border-gray-300 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 truncate">{a.name}</span>
                      {a.hasUnread && <span className="flex h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{a.listing}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    <span className="text-[10px] text-gray-400">{a.timeAgo}</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500 group-hover:text-black transition-colors">{a.cta}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4 border border-gray-200 bg-white rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Pipeline</p>
              <p className="text-base font-semibold text-black">Lead stages</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => navigate('/agent/leads')}>
              Kanban <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          {pipeline.reduce((s, p) => s + p.count, 0) > 0 && (
            <div className="flex rounded-full overflow-hidden h-2.5">
              {pipeline.filter((p) => p.count > 0).map((p) => (
                <div
                  key={p.stage}
                  className={`${pipelineColors[p.stage] || 'bg-gray-400'} transition-all`}
                  style={{ width: `${(p.count / pipeline.reduce((s, x) => s + x.count, 0)) * 100}%` }}
                  title={`${p.stage}: ${p.count}`}
                />
              ))}
            </div>
          )}
          <div className="space-y-2">
            {pipeline.map((p) => (
              <div key={p.stage} className="flex items-center justify-between rounded-lg px-3 py-2 bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${pipelineColors[p.stage] || 'bg-gray-400'}`} />
                  <span className="text-xs font-semibold text-gray-700">{p.stage}</span>
                </div>
                <span className="text-sm font-bold text-black">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Analytics', icon: BarChart3, to: '/agent/analytics', desc: 'Performance metrics' },
          { label: 'Listings', icon: ListChecks, to: '/agent/listings', desc: 'Manage inventory' },
          { label: 'Viewings', icon: Clock, to: '/agent/viewings', desc: 'Schedule & confirm' },
          { label: 'Verification', icon: Zap, to: '/agent/verification', desc: 'Account status' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.to)}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors text-left group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 group-hover:bg-black group-hover:text-white transition-colors flex-shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                <p className="text-[11px] text-gray-500">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {stats?.insights && (stats as AgentStatsResponse).insights && (stats as AgentStatsResponse).insights!.length > 0 && (
        <div className="border border-gray-200 bg-white rounded-lg p-5 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.18em] text-gray-400 mb-3">Conversion insights</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(stats as AgentStatsResponse).insights!.map((i) => (
              <div key={i.label} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">{i.label}</p>
                <p className="text-xl font-semibold text-black mt-1">{i.value}</p>
                {i.hint && <p className="text-[11px] text-gray-500 mt-0.5">{i.hint}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ListingPortfolioCard({ listing, onManage }: { listing: AgentListing; onManage: () => void }) {
  const imgUrl = listing.images?.find((i) => i.isPrimary)?.url || listing.images?.[0]?.url || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80';
  const location = [listing.location?.area, listing.location?.city].filter(Boolean).join(', ') || 'Kenya';
  const isSold = listing.availabilityStatus === 'sold' || listing.availabilityStatus === 'let';
  const isDraft = listing.status === 'draft';
  const statusLabel = isSold ? 'Sold' : isDraft ? 'Draft' : 'Active';
  const statusClass = isSold ? 'bg-gray-100 text-gray-600' : isDraft ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200';

  return (
    <div
      className="group bg-white border border-gray-200 hover:border-black transition-all duration-300 rounded-lg overflow-hidden flex flex-col md:flex-row h-auto md:h-48 cursor-pointer hover:shadow-sm"
      onClick={onManage}
      onKeyDown={(e) => e.key === 'Enter' && onManage()}
      role="button"
      tabIndex={0}
    >
      <div className="w-full md:w-64 h-48 md:h-full relative overflow-hidden bg-gray-100 flex-shrink-0">
        <img
          src={imgUrl}
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 grayscale-[20%] group-hover:grayscale-0"
        />
        <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest border ${statusClass}`}>
          {statusLabel}
        </div>
      </div>
      <div className="flex-1 p-6 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex justify-between items-start mb-2">
            <div className="min-w-0">
              <h3 className="text-xl font-serif font-medium text-black group-hover:underline decoration-1 underline-offset-4 truncate">{listing.title}</h3>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1 flex items-center">
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-2 flex-shrink-0" />
                <span className="truncate">{location}</span>
              </p>
            </div>
            <MoreHorizontal className="w-5 h-5 text-gray-400 hover:text-black flex-shrink-0 ml-2" />
          </div>
          <p className="font-mono text-lg font-medium mt-2 text-black">
            {listing.currency === 'KES' ? 'KES' : listing.currency} {Number(listing.price).toLocaleString()}
            {isSold ? null : <span className="text-xs text-gray-400 font-sans"> / mo</span>}
          </p>
          {isSold && <p className="font-mono text-lg font-medium mt-0.5 line-through text-gray-400">{listing.currency} {Number(listing.price).toLocaleString()}</p>}
        </div>
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <Eye className="w-4 h-4 text-gray-400" />
            —
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <Heart className="w-4 h-4 text-gray-400" />
            —
          </div>
          <div className="flex-1 text-right">
            {isSold ? (
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-600">Deal Closed</span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-widest hover:underline decoration-1 underline-offset-4">Manage</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
