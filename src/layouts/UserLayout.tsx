import React, { useState, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Compass,
  MapPin,
  Bookmark,
  MessageSquare,
  Settings,
  Search,
  Bell,
  ChevronRight,
  LogOut,
  CalendarClock,
  Wallet,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthProvider';
import { useNotifications } from '../context/NotificationContext';
import { NotificationDrawer } from '../components/NotificationDrawer';
import { BottomNav } from '../components/ui/BottomNav';
import { prefetchHandlers } from '../lib/prefetch';

const navLinks = [
  { to: '/app/home', label: 'Dashboard', icon: LayoutGrid },
  { to: '/app/explore', label: 'Explore', icon: Compass },
  { to: '/app/inventory', label: 'Inventory', icon: MapPin },
  { to: '/app/saved', label: 'Saved', icon: Bookmark },
  { to: '/app/messages', label: 'Messages', icon: MessageSquare },
  { to: '/app/viewings', label: 'Schedule', icon: CalendarClock },
  { to: '/app/profile', label: 'Profile', icon: Settings },
  { to: '/pay/login', label: 'Payments', icon: Wallet },
];

type SidebarItemProps = {
  icon: (typeof navLinks)[number]['icon'];
  label: string;
  to: string;
  active: boolean;
  badge?: number;
};

function SidebarItem({ icon: Icon, label, to, active, badge }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      className={cn(
        'w-full flex items-center gap-4 px-4 py-3 rounded-lg group transition-all duration-200',
        active ? 'bg-black text-white' : 'text-black/60 hover:bg-black/5 hover:text-black'
      )}
      {...prefetchHandlers(to)}
    >
      <div className="relative flex-shrink-0">
        <Icon className="w-5 h-5" />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-0.5 right-0 w-2 h-2 bg-orange-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </div>
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] hidden lg:block">
        {label}
      </span>
    </NavLink>
  );
}

export function UserLayout() {
  const { conversations } = useChat();
  const { user, logout, isAuthed } = useAuth();
  const { unread: unreadNotifications, markAllRead } = useNotifications();
  const unreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeLabel = (() => {
    const matches = navLinks.filter(
      (link) => location.pathname === link.to || location.pathname.startsWith(link.to + '/')
    );
    const best = matches.sort((a, b) => b.to.length - a.to.length)[0];
    return best?.label ?? 'Home';
  })();

  const tickerItems = useMemo(() => {
    const items: string[] = [];

    if (unreadMessages > 0) {
      items.push(`${unreadMessages} unread message${unreadMessages === 1 ? '' : 's'} waiting`);
    }
    if (unreadNotifications > 0) {
      items.push(
        `${unreadNotifications} new alert${unreadNotifications === 1 ? '' : 's'} in your inbox`
      );
    }

    items.push(`Workspace: ${activeLabel}`);
    items.push('Instant chat updates when agents respond');
    items.push('Schedule viewings directly from listing cards');
    items.push('Saved listings sync across your devices');

    return items;
  }, [unreadMessages, unreadNotifications, activeLabel]);

  const displayName =
    user?.name
      ?.trim()
      ?.replace(/^buyer\s+/i, '')
      ?.split(/\s+/)[0] ?? 'User';
  const initial = (displayName?.charAt(0) ?? 'U').toUpperCase();

  const handleSearchClick = () => {
    if (!location.pathname.startsWith('/app/explore')) navigate('/app/explore');
  };

  const visibleNavLinks = isAuthed ? navLinks : navLinks.filter((l) => l.to === '/app/explore');

  return (
    <div className="bg-white text-black flex h-screen overflow-hidden selection:bg-black selection:text-white font-sans">
      <style>{`
        @keyframes zeniTicker {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }
        .zeni-ticker-wrap {
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
        .zeni-ticker-track {
          display: inline-flex;
          white-space: nowrap;
          min-width: max-content;
          animation: zeniTicker 34s linear infinite;
          will-change: transform;
        }
        .zeni-ticker-wrap:hover .zeni-ticker-track,
        .zeni-ticker-wrap:focus-within .zeni-ticker-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .zeni-ticker-track {
            animation: none;
            transform: translate3d(0, 0, 0);
          }
          .zeni-ticker-clone {
            display: none;
          }
        }
      `}</style>

      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-white border-r border-black/10 flex flex-col justify-between py-8 z-30 flex-shrink-0">
        <div>
          <NavLink
            to="/app/home"
            className="px-6 mb-12 flex items-center gap-3 justify-center lg:justify-start"
          >
            <span className="text-3xl font-serif font-bold tracking-tight text-black">
              ZENI<span className="text-green-500">.</span>
            </span>
          </NavLink>
          <nav className="space-y-1 px-3">
            {visibleNavLinks.map((link) => (
              <SidebarItem
                key={link.to}
                {...link}
                active={
                  location.pathname === link.to || location.pathname.startsWith(`${link.to}/`)
                }
                badge={link.to === '/app/messages' ? unreadMessages : undefined}
              />
            ))}
          </nav>
        </div>

        <div className="px-6">
          <button
            onClick={logout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-black/60 hover:bg-black/5 hover:text-black transition-all mb-2"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] hidden lg:block">
              Log out
            </span>
          </button>
          <div className="flex items-center gap-3 pt-4 border-t border-black/10">
            <div className="w-8 h-8 bg-black text-white flex items-center justify-center text-xs font-serif italic rounded-full flex-shrink-0">
              {initial}
            </div>
            <div className="hidden lg:block min-w-0">
              <p className="text-xs font-bold text-black uppercase tracking-wide truncate">
                {displayName}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        id="main-content"
        className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative"
      >
        <header className="h-16 bg-white border-b border-black/10 flex items-center justify-between px-6 lg:px-8 flex-shrink-0 z-20 gap-8">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-black/50 flex-shrink-0">
            <span>Workspace</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-black">{activeLabel}</span>
          </div>

          {/* Ticker */}
          <div className="hidden md:flex items-center flex-1 min-w-0 max-w-3xl mx-auto">
            <div className="sr-only" aria-live="polite">
              {tickerItems.join('. ')}
            </div>
            <div
              aria-hidden="true"
              className="zeni-ticker-wrap relative flex-1 overflow-hidden border border-black/10 bg-white rounded-sm"
            >
              <div className="zeni-ticker-track py-1.5 text-[11px] font-mono text-black/60">
                {tickerItems.map((item, idx) => (
                  <span key={`ticker-item-${idx}`} className="inline-flex items-center gap-2 mx-6">
                    <span className="w-1 h-1 rounded-full bg-green-500" />
                    {item}
                  </span>
                ))}
                {tickerItems.map((item, idx) => (
                  <span
                    key={`ticker-item-clone-${idx}`}
                    className="zeni-ticker-clone inline-flex items-center gap-2 mx-6"
                  >
                    <span className="w-1 h-1 rounded-full bg-green-500" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={handleSearchClick}
                className="p-2 text-black/50 hover:text-green-600 transition-colors rounded-sm"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  markAllRead();
                  setDrawerOpen(true);
                }}
                className="p-2 text-black/50 hover:text-green-600 transition-colors rounded-sm relative"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white" />
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scroll bg-white p-8">
          <Outlet />
        </div>
      </main>

      {isAuthed && <NotificationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
      <BottomNav
        tabs={visibleNavLinks.map((link) => ({ to: link.to, label: link.label, icon: link.icon }))}
        badges={unreadMessages > 0 ? { '/app/messages': unreadMessages } : {}}
        variant="light"
        className="xl:hidden"
      />
    </div>
  );
}
