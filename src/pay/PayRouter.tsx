import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { PayAuthProvider, usePayAuth } from './PayAuthContext';
import { PayAppLayout } from './layout/PayAppLayout';
import { PayLogin } from './pages/PayLogin';
import { PayDashboard } from './pages/PayDashboard';
import { PayPayments } from './pages/PayPayments';
import { PayTransactions } from './pages/PayTransactions';
import { PayReceipt } from './pages/PayReceipt';
import { PayProfile } from './pages/PayProfile';
import { PayAdminReconcile } from './pages/PayAdminReconcile';

function PayRequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthed, loading } = usePayAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-2xl border border-slate-800 px-4 py-3 text-sm font-semibold animate-pulse">
          Securing session...
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return <Navigate to="/pay/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

function PayRequireRole({ roles, children }: { roles: Array<'user' | 'agent' | 'admin' | 'finance'>; children: React.ReactNode }) {
  const { user } = usePayAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/pay/dashboard" replace />;
  }
  return <>{children}</>;
}

export function PayRouter() {
  return (
    <PayAuthProvider>
      <Routes>
        <Route path="login" element={<PayLogin />} />
        <Route
          element={
            <PayRequireAuth>
              <PayAppLayout />
            </PayRequireAuth>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<PayDashboard />} />
          <Route path="payments" element={<PayPayments />} />
          <Route path="transactions" element={<PayTransactions />} />
          <Route path="receipts/:id" element={<PayReceipt />} />
          <Route path="profile" element={<PayProfile />} />
          <Route
            path="admin"
            element={
              <PayRequireRole roles={['admin', 'finance']}>
                <Outlet />
              </PayRequireRole>
            }
          >
            <Route index element={<Navigate to="reconcile" replace />} />
            <Route path="reconcile" element={<PayAdminReconcile />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/pay/dashboard" replace />} />
      </Routes>
    </PayAuthProvider>
  );
}

