import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PaySidebar } from '../components/PaySidebar';
import { PayTopbar } from '../components/PayTopbar';

export function PayAppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="pay-console flex h-screen overflow-hidden bg-[#09090B] text-[#FAFAFA] font-sans">
      <PaySidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col min-w-0 lg:pl-64">
        <PayTopbar
          onMenuClick={() => setSidebarOpen(true)}
          title={titleForPath(location.pathname)}
          subtitle="Encrypted • Real-time"
        />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function titleForPath(pathname: string): string {
  if (pathname.includes('/pay/transactions') || pathname === '/pay/transactions') return 'Transaction Ledger';
  if (pathname.includes('/pay/payments') || pathname === '/pay/payments') return 'Payment Gateway';
  if (pathname.includes('/pay/profile') || pathname === '/pay/profile') return 'Profile';
  if (pathname.includes('/pay/admin')) return 'Admin';
  return 'Financial Overview';
}
