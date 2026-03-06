import React, { useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  MessageCircle,
  CalendarClock,
  BarChart3,
  ShieldCheck,
  Settings,
  Bell,
  Plus,
  LogOut,
  ChevronRight,
  Search,
} from 'lucide-react';
import { BottomNav } from '../components/ui/BottomNav';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthProvider';
import { useNotifications } from '../context/NotificationContext';
import { NotificationDrawer } from '../components/NotificationDrawer';
import { MobileMoreMenu } from '../components/ui/MobileMoreMenu';

const tabs = [
  { to: '/agent/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/agent/listings', label: 'Listings', icon: Building2 },
  { to: '/agent/leads', label: 'Leads', icon: Users },
  { to: '/agent/viewings', label: 'Viewings', icon: CalendarClock },
  { to: '/agent/messages', label: 'Comms', icon: MessageCircle },
  { to: '/agent/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/agent/verification', label: 'Verification', icon: ShieldCheck },
  { to: '/agent/settings', label: 'Settings', icon: Settings },
];

const mobileTabs = [
  { to: '/agent/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agent/listings', label: 'Listings', icon: Building2 },
  { to: '/agent/leads', label: 'Leads', icon: Users },
  { to: '/agent/messages', label: 'Messages', icon: MessageCircle },
  { to: '/agent/settings', label: 'Settings', icon: Settings },
];

export function AgentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { conversations } = useChat();
  const { user, logout } = useAuth();
  const { unread: unreadNotifications } = useNotifications();
  const unread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);

  React.useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const routeMeta = useMemo(() => {
    if (location.pathname.startsWith('/agent/listings/new')) return { title: 'Create Listing' };
    if (location.pathname.startsWith('/agent/listings')) return { title: 'My Listings' };
    if (location.pathname.startsWith('/agent/leads')) return { title: 'Leads' };
    if (location.pathname.startsWith('/agent/viewings')) return { title: 'Viewing Schedule' };
    if (location.pathname.startsWith('/agent/messages')) return { title: 'Comms' };
    if (location.pathname.startsWith('/agent/analytics')) return { title: 'Analytics' };
    if (location.pathname.startsWith('/agent/verification')) return { title: 'Verification' };
    if (location.pathname.startsWith('/agent/settings')) return { title: 'Settings' };
    if (location.pathname.startsWith('/agent/boost')) return { title: 'Boost your reach' };
    return { title: 'Overview' };
  }, [location.pathname]);

  const isWideCanvas =
    location.pathname.startsWith('/agent/messages') ||
    location.pathname.startsWith('/agent/listings/new') ||
    location.pathname.includes('/edit');

  return (
    <div className="flex h-screen overflow-hidden bg-white text-black selection:bg-black selection:text-white">
      {/* Sidebar — white, black/green/orange */}
      <aside className="hidden xl:flex w-64 flex-col justify-between border-r border-black/10 bg-white py-6 z-20 flex-shrink-0">
        <div>
          <div className="px-6 mb-12">
            <span className="text-2xl font-serif font-bold tracking-tight text-black">
              ZENI<span className="text-green-500">.</span>
            </span>
            <span className="text-[9px] font-bold uppercase tracking-widest block mt-1 text-black/60">
              Partner Portal
            </span>
          </div>

          <nav className="space-y-1 px-3" aria-label="Main sidebar navigation">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active =
                location.pathname === tab.to || location.pathname.startsWith(`${tab.to}/`);
              const showBadge = tab.to === '/agent/messages' && unread > 0;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all ${
                    active
                      ? 'bg-black text-white'
                      : 'text-black/60 hover:bg-black/5 hover:text-black'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] flex-1">
                    {tab.label}
                  </span>
                  {showBadge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-orange-500 text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="px-6 pt-6 border-t border-black/10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-black/10 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold text-black">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide truncate">
                {user?.name || 'Agent'}
              </p>
              <p className="text-[10px] text-gray-400">Senior Agent</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest text-black/60 hover:bg-black/5 hover:text-black transition-colors"
          >
            <LogOut className="w-3 h-3 flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header — white, breadcrumb + search + bell + Create Listing */}
        <header className="h-16 bg-white border-b border-black/10 flex items-center justify-between px-6 lg:px-8 flex-shrink-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-black/50">
            <span>Workspace</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-black">{routeMeta.title}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-black/40" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-9 pr-4 py-2 border border-black/10 rounded-sm text-xs font-medium focus:outline-none focus:border-black w-64 bg-white focus:bg-white transition-all"
              />
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="w-8 h-8 flex items-center justify-center border border-black/10 rounded-sm hover:bg-black hover:text-white transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-bold">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/agent/listings/new')}
              className="bg-orange-500 text-white px-4 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-orange-600 transition-colors flex items-center gap-2"
            >
              <Plus className="w-3 h-3" />
              Create Listing
            </button>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest text-black/60 hover:bg-black/5 hover:text-black border border-black/10 transition-colors"
              aria-label="Log out"
            >
              <LogOut className="w-3 h-3" />
              Logout
            </button>
          </div>
        </header>

        <main
          className={`flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth portal-scroll ${
            isWideCanvas ? '' : 'max-w-6xl mx-auto w-full'
          }`}
        >
          <Outlet />
        </main>

        <NotificationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

        <BottomNav
          tabs={mobileTabs}
          badges={unread > 0 ? { '/agent/messages': unread } : {}}
          variant="light"
          className="xl:hidden"
        />
        <MobileMoreMenu
          open={moreOpen}
          onToggle={() => setMoreOpen((prev) => !prev)}
          onClose={() => setMoreOpen(false)}
          title="More Actions"
          items={tabs.filter((tab) => !mobileTabs.some((m) => m.to === tab.to))}
          theme="light"
        />
      </div>
    </div>
  );
}
