import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  BarChart3,
  Users,
  Building2,
  Settings,
  LayoutDashboard,
  Bell,
  Search,
  MessageCircle,
  LogOut,
  ScrollText,
  Wallet,
  Network,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useChat } from '../context/ChatContext';
import { useNotifications } from '../context/NotificationContext';
import { NotificationDrawer } from '../components/NotificationDrawer';
import { BottomNav } from '../components/ui/BottomNav';
import { MobileMoreMenu } from '../components/ui/MobileMoreMenu';
import { AdminStepUpProvider, useAdminStepUp } from '../context/AdminStepUpContext';
import { AdminStepUpModal } from '../components/admin/AdminStepUpModal';

const navItems = [
  { to: '/admin/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/verification', label: 'Moderation', icon: ShieldCheck },
  { to: '/admin/refund-requests', label: 'Refund requests', icon: Wallet },
  { to: '/admin/users', label: 'User Base', icon: Users },
  { to: '/admin/listings', label: 'Inventory', icon: Building2 },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/audit', label: 'Audit Logs', icon: ScrollText },
  { to: '/admin/network-access', label: 'Network Access', icon: Network },
  { to: '/admin/messages', label: 'Messages', icon: MessageCircle },
  { to: '/admin/settings', label: 'Settings', icon: Settings }
];

const mobileTabs = [
  { to: '/admin/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/verification', label: 'Verify', icon: ShieldCheck },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/messages', label: 'Messages', icon: MessageCircle },
  { to: '/admin/settings', label: 'Settings', icon: Settings }
];

function AdminShell() {
  const { user, logout } = useAuth();
  const { conversations } = useChat();
  const { unread: unreadNotifications, markAllRead } = useNotifications();
  const { open, close, submit, loading, error } = useAdminStepUp();
  const location = useLocation();
  const unread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  React.useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const routeMeta = useMemo(() => {
    if (location.pathname.startsWith('/admin/verification')) return { title: 'Moderation Queue' };
    if (location.pathname.startsWith('/admin/users')) return { title: 'User Base' };
    if (location.pathname.startsWith('/admin/listings')) return { title: 'Inventory' };
    if (location.pathname.startsWith('/admin/reports')) return { title: 'Reports' };
    if (location.pathname.startsWith('/admin/audit')) return { title: 'Audit Logs' };
    if (location.pathname.startsWith('/admin/network-access')) return { title: 'Network Access' };
    if (location.pathname.startsWith('/admin/messages')) return { title: 'Messages' };
    if (location.pathname.startsWith('/admin/settings')) return { title: 'Settings' };
    if (location.pathname.startsWith('/admin/refund-requests')) return { title: 'Refund requests' };
    return { title: 'Overview' };
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-white text-black selection:bg-black selection:text-white">
      {/* Sidebar — black, green dot, orange badges */}
      <aside className="hidden xl:flex w-64 flex-col justify-between border-r border-white/10 bg-black text-white py-6 z-20 flex-shrink-0">
        <div>
          <div className="px-6 mb-12">
            <span className="text-2xl font-serif font-bold tracking-tight text-white">ZENI<span className="text-green-400">.</span></span>
            <span className="text-[9px] font-bold uppercase tracking-widest block mt-1 text-white/60">Admin Console</span>
          </div>

          <nav className="space-y-1 px-3" aria-label="Main sidebar navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
              const showBadge = item.to === '/admin/verification' && false; // optional: pending count
              const showMsgBadge = item.to === '/admin/messages' && unread > 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all ${
                    isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] flex-1">{item.label}</span>
                  {showBadge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-orange-500 text-white">12</span>
                  )}
                  {showMsgBadge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-orange-500 text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="px-6 pt-6 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide truncate text-white">{user?.name || 'Admin'}</p>
              <p className="text-[10px] text-white/50">Super Admin</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        {/* Header — white, black/green/orange */}
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
                placeholder="Search users, listings, reports..."
                className="pl-9 pr-4 py-2 border border-black/10 rounded-sm text-xs font-medium focus:outline-none focus:border-black w-64 bg-white focus:bg-white transition-all"
              />
            </div>
            {unreadNotifications > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="hidden lg:inline-flex h-9 px-4 bg-black text-white border border-black text-xs font-medium items-center gap-2 rounded-sm hover:bg-black/90 transition-colors"
              >
                Mark Read
              </button>
            )}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="w-8 h-8 flex items-center justify-center bg-black text-white border border-black rounded-sm hover:bg-black/90 transition-colors relative"
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
              onClick={logout}
              className="hidden lg:inline-flex items-center gap-2 bg-black text-white border border-black px-4 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-black/90 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 portal-scroll">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>

        <BottomNav
          tabs={mobileTabs}
          badges={unread > 0 ? { '/admin/messages': unread } : {}}
          className="xl:hidden"
        />
        <MobileMoreMenu
          open={moreOpen}
          onToggle={() => setMoreOpen((prev) => !prev)}
          onClose={() => setMoreOpen(false)}
          title="More Controls"
          items={navItems.filter((item) => !mobileTabs.some((m) => m.to === item.to))}
          theme="dark"
        />

        <NotificationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <AdminStepUpModal open={open} onClose={close} onSubmit={submit} loading={loading} error={error} />
      </div>
    </div>
  );
}

export function AdminLayout() {
  return (
    <AdminStepUpProvider>
      <AdminShell />
    </AdminStepUpProvider>
  );
}
