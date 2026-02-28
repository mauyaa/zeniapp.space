import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Card } from '../components/ui/Card';

const links = [
  { to: '/pay/dashboard', label: 'Dashboard' },
  { to: '/pay/invoices', label: 'Invoices' },
  { to: '/pay/history', label: 'History' },
  { to: '/pay/security', label: 'Security' },
  { to: '/pay/support', label: 'Support' }
];

export function PaymentLayout() {
  return (
    <div className="min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--text))]">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-[rgb(var(--text))]">Payment Portal</div>
            <div className="text-xs text-[rgb(var(--muted))]">Secured payments • Receipts issued</div>
          </div>
          <div className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-xs text-[rgb(var(--text))]">
            Lock • TLS
          </div>
        </div>
        <Card className="flex gap-2 overflow-x-auto border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[rgb(var(--accent))] text-[rgb(var(--bg))]'
                    : 'text-[rgb(var(--text))] hover:bg-[rgb(var(--surface2))]'
                }`
              }>
              {l.label}
            </NavLink>
          ))}
        </Card>
        <Outlet />
      </div>
    </div>
  );
}
