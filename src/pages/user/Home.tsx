import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import {
  Home,
  Calendar,
  MessageCircle,
  Plus,
  Activity,
  Tag,
  ChevronRight,
} from 'lucide-react';
import { ListingDrawer } from '../../components/listings/ListingDrawer';
import { useHomeData } from '../../hooks/useHomeData';
import { useChat } from '../../context/ChatContext';
import { OnboardingBanner } from '../../components/ui/OnboardingBanner';

export function HomePage() {
  const navigate = useNavigate();
  const { conversations } = useChat();
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const {
    loading,
    setSelectedId,
    selectedDetail,
    upcomingViewings,
    displayName,
    timeGreeting,
    savedCount,
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
        amount: String(Math.round(property.price))
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
  const pendingViewings = upcomingViewings.length;
  const subtitle =
    pendingViewings > 0
      ? `Your property command center is active. You have ${pendingViewings} viewing request${pendingViewings !== 1 ? 's' : ''} pending.`
      : 'Your property command center is active.';

  return (
    <div className="fade-in max-w-7xl mx-auto">
      <OnboardingBanner />

      {/* Header: date pill, greeting, CTA */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-end border-b border-gray-200 pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-white mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{dateLabel}</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl text-black mb-3 leading-tight font-serif">
            Good {timeGreeting},{' '}
            <span className="italic text-green-500">{displayName}.</span>
          </h1>
          <p className="text-sm text-gray-500 max-w-md">{subtitle}</p>
        </div>
        <button
  type="button"
  onClick={() => navigate('/app/viewings')}
  className="mt-6 md:mt-0 bg-green-500 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-green-600 transition-all flex items-center gap-2 shadow-lg"
>
  <Plus className="w-4 h-4" aria-hidden="true" />
  Schedule Viewing
</button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <button
          type="button"
          onClick={() => navigate('/app/saved')}
          className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover-lift text-left"
        >
          <div className="flex justify-between items-start mb-4">
            <Home className="w-5 h-5 text-gray-400" aria-hidden="true" />
            {savedCount > 0 && (
              <span className="text-xs font-mono text-green-600 bg-green-50 px-2 py-1 rounded">+{savedCount}</span>
            )}
          </div>
          <p className="text-2xl font-serif font-bold">{loading ? '—' : savedCount}</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-400">Saved Listings</p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/app/viewings')}
          className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover-lift text-left"
        >
          <div className="flex justify-between items-start mb-4">
            <Calendar className="w-5 h-5 text-gray-400" aria-hidden="true" />
            <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">0</span>
          </div>
          <p className="text-2xl font-serif font-bold">{loading ? '—' : upcomingViewings.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-400">Upcoming Visits</p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/app/messages')}
          className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover-lift text-left"
        >
          <div className="flex justify-between items-start mb-4">
            <MessageCircle className="w-5 h-5 text-gray-400" aria-hidden="true" />
            {unreadMessages > 0 && (
              <span className="text-xs font-mono text-green-600 bg-green-50 px-2 py-1 rounded">New</span>
            )}
          </div>
          <p className="text-2xl font-serif font-bold">{unreadMessages}</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-400">Unread Chats</p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/app/explore')}
          className="bg-black text-white p-6 rounded-xl shadow-lg relative overflow-hidden group cursor-pointer block text-left w-full"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-gray-800 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform" aria-hidden="true" />
          <h3 className="font-serif text-xl mb-1 relative z-10">Premium Access</h3>
          <p className="text-xs text-gray-400 mb-4 relative z-10">Upgrade for concierge support.</p>
          <span className="text-[10px] font-bold uppercase tracking-widest border-b border-white pb-1 relative z-10 inline-block">
            View Plans
          </span>
        </button>
      </div>

      {/* Live Activity */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-900 mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4" aria-hidden="true" />
          Live Activity
        </h2>
        <div className="space-y-3">
          {activityFeed.length === 0 ? (
            <div className="bg-white p-4 rounded-xl border border-gray-100 text-sm text-gray-500">
              No recent activity. Start exploring or messaging agents.
            </div>
          ) : (
            activityFeed.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => item.href && navigate(item.href)}
                className="w-full bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between hover:border-black transition-colors cursor-pointer group text-left"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 group-hover:bg-black group-hover:text-white transition-colors flex-shrink-0">
                    {item.type === 'message' ? (
                      <MessageCircle className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Tag className="w-4 h-4" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-black truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 truncate">{item.desc || item.time}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-black flex-shrink-0" aria-hidden="true" />
              </button>
            ))
          )}
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
