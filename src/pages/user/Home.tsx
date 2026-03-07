import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, MessageCircle, Plus, BarChart3 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ListingDrawer } from '../../components/listings/ListingDrawer';
import { useHomeData } from '../../hooks/useHomeData';
import { useChat } from '../../context/ChatContext';
import { resolveUserContactLabel, getAgentOtherPartyKey } from '../messages/contactLabels';
import type { Conversation } from '../../types/chat';

export function HomePage() {
  const navigate = useNavigate();
  const { conversations } = useChat();
  const dedupedConversations = useMemo(() => {
    const map = new Map<string, Conversation>();
    const sorted = [...conversations].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
    sorted.forEach((c) => {
      let key = resolveUserContactLabel(c.agentSnapshot?.name);
      if (c.userSnapshot?.role === 'admin') key = 'zeni-admin';
      if (c.userSnapshot?.role === 'agent') key = getAgentOtherPartyKey(c);
      if (!map.has(key)) map.set(key, c);
    });
    return Array.from(map.values());
  }, [conversations]);
  const unreadMessages = dedupedConversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const {
    loading,
    refreshing,
    setSelectedId,
    selectedDetail,
    displayName,
    timeGreeting,
    savedCount,
    newMatchesCount,
    activityFeed,
    handleViewing,
    handleMessage,
    handleSaveToggle,
    handleShare,
  } = useHomeData();

  const handleBuy = useCallback(
    (property: { id: string; price: number; purpose: 'rent' | 'buy' }) => {
      const purpose = property.purpose === 'buy' ? 'property_purchase' : 'rent';
      const params = new URLSearchParams({
        purpose,
        referenceId: property.id,
        amount: String(Math.round(property.price)),
      });
      navigate(`/pay/payments?${params.toString()}`);
    },
    [navigate]
  );

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-500">
            {dateLabel}
          </p>
          <h1 className="mt-2 text-4xl md:text-5xl font-serif font-semibold text-gray-900">
            Good {timeGreeting}, {displayName}.
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {refreshing && <span className="text-xs font-mono text-emerald-600">Updating…</span>}
          <Button
            type="button"
            size="zeni-md"
            variant="zeni-primary"
            className="rounded-full px-5"
            onClick={() => navigate('/app/viewings')}
          >
            <Plus className="w-4 h-4 mr-2" /> Schedule Viewing
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Home className="w-5 h-5 text-emerald-600" />}
          label="Saved"
          value={loading ? '—' : savedCount}
          helper={savedCount > 0 ? '+ new' : ''}
          onClick={() => navigate('/app/saved')}
        />
        <StatCard
          icon={<MessageCircle className="w-5 h-5 text-blue-600" />}
          label="Active Chats"
          value={unreadMessages > 0 ? `${unreadMessages} new` : dedupedConversations.length || '0'}
          helper=""
          onClick={() => navigate('/app/messages')}
        />
        <StatCard
          icon={<BarChart3 className="w-5 h-5 text-fuchsia-600" />}
          label="Matches"
          value={loading ? '—' : newMatchesCount}
          helper="Based on filters"
          onClick={() => navigate('/app/explore')}
        />
        <MarketPulseCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Schedule your first viewing</h2>
            <Button variant="outline" size="zeni-sm" onClick={() => navigate('/app/explore')}>
              Browse listings
            </Button>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Once you book a tour, your schedule will appear here with agent details and real-time
            status updates.
          </p>
          <div className="mt-4 text-xs text-gray-500">Join 200+ users booking today</div>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-700 mb-3">
            Activity
          </h3>
          <ul className="space-y-3 text-sm text-gray-700">
            {activityFeed.slice(0, 4).map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <span
                  className={`mt-1 h-2 w-2 rounded-full ${item.type === 'message' ? 'bg-blue-500' : 'bg-emerald-500'}`}
                />
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.desc || item.time}</p>
                </div>
              </li>
            ))}
            {activityFeed.length === 0 && (
              <li className="text-gray-500 text-xs">No recent activity.</li>
            )}
          </ul>
        </div>
      </div>

      <ListingDrawer
        open={Boolean(selectedDetail)}
        property={selectedDetail}
        onClose={() => setSelectedId(null)}
        onViewingsSubmit={handleViewing}
        onMessage={(prop) => prop && handleMessage(prop, navigate)}
        onSave={(prop) => prop && handleSaveToggle(prop.id)}
        onShare={(prop) => prop && handleShare(prop)}
        onBuy={handleBuy}
        isSaved={selectedDetail?.saved}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  helper,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  helper?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4 hover:border-gray-200 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="text-gray-700">{icon}</span>
        {helper ? (
          <span className="text-[11px] font-semibold text-emerald-600">{helper}</span>
        ) : null}
      </div>
      <p className="mt-4 text-3xl font-serif font-semibold text-gray-900">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 mt-1">
        {label}
      </p>
    </button>
  );
}

function MarketPulseCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
          Market Pulse
        </p>
        <span className="text-xs font-semibold text-emerald-600">+4.2%</span>
      </div>
      <div className="mt-3 flex items-end gap-2 h-14">
        <div className="w-8 h-3 bg-gray-200 rounded-sm" />
        <div className="w-8 h-6 bg-gray-200 rounded-sm" />
        <div className="w-8 h-8 bg-gray-200 rounded-sm" />
        <div className="w-8 h-12 bg-emerald-400 rounded-sm" />
        <div className="w-8 h-5 bg-gray-200 rounded-sm" />
      </div>
      <p className="mt-3 text-xs text-gray-600">
        Prices in your saved area are trending upward. It might be time to book a viewing.
      </p>
    </div>
  );
}
