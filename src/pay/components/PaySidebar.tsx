import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, CreditCard, List, User, LogOut, ShieldCheck } from 'lucide-react';

function ZeniLogo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-lg bg-emerald-800 ${className ?? 'w-10 h-10'}`}>
      <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.5} />
    </div>
  );
}
import { usePayAuth } from '../PayAuthContext';

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hidden?: boolean;
};

const navItems: NavItem[] = [
  { to: '/pay/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pay/payments', label: 'Make Payment', icon: CreditCard },
  { to: '/pay/transactions', label: 'Ledger', icon: List },
  { to: '/pay/profile', label: 'Profile', icon: User },
];

const adminItems: NavItem[] = [
  { to: '/pay/admin/reconcile', label: 'Reconcile', icon: ShieldCheck },
];

export function PaySidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = usePayAuth();

  const sessionId = typeof window !== 'undefined'
    ? (() => {
        try {
          const t = localStorage.getItem('pay_access_token');
          return t ? `${t.slice(0, 3)}-${t.slice(3, 6)}-${t.slice(6, 8)}` : '882-991-AZ';
        } catch {
          return '882-991-AZ';
        }
      })()
    : '882-991-AZ';

  const content = (
    <>
      <div>
        <Link to="/pay/dashboard" className="px-6 mb-12 flex items-start gap-3 hover:opacity-90 transition-opacity">
          <ZeniLogo className="w-10 h-10 shrink-0" />
          <div>
           <span className="text-2xl font-serif font-bold tracking-tight text-white">
  ZENI<span className="text-green-500">.</span>
</span>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] block mt-1 text-zinc-500">
              SECURE GATEWAY
            </span>
          </div>
        </Link>

        <nav className="space-y-1 px-3">
          {navItems.filter((item) => !item.hidden).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `w-full flex items-center gap-4 px-4 py-3 rounded-sm group transition-all border-l-2 ${
                  isActive
                    ? 'bg-zinc-800 text-white border-emerald-500'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white border-transparent'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]">{item.label}</span>
            </NavLink>
          ))}
          {user && ['admin', 'finance'].includes(user.role) && (
            <>
              <div className="mt-4 px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Admin
              </div>
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `w-full flex items-center gap-4 px-4 py-3 rounded-sm group transition-all border-l-2 ${
                      isActive
                        ? 'bg-zinc-800 text-white border-emerald-500'
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-white border-transparent'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.15em]">{item.label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>
      </div>

      <div className="px-6">
        <div className="p-4 bg-zinc-900 rounded-sm border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-zinc-400">Secure Session</span>
          </div>
          <p className="text-[10px] text-zinc-600 font-mono">ID: {sessionId}</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await logout();
            onClose();
          }}
          className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
        >
          <LogOut className="w-3 h-3" />
          Terminate Session
        </button>
      </div>
    </>
  );

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed z-50 flex h-full w-64 flex-col justify-between border-r border-zinc-800 py-8 bg-[#09090B] lg:static lg:translate-x-0 transition-transform ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {content}
      </aside>
    </>
  );
}
