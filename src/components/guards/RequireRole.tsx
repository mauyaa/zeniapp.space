import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, Role } from '../../context/AuthProvider';

function homeFor(role: Role) {
  if (role === 'admin') return '/admin/verification';
  if (role === 'agent') return '/agent/dashboard';
  return '/app/home';
}

export function RequireRole({
  roles,
  redirectToRole = false,
  children
}: {
  roles: Role[];
  redirectToRole?: boolean;
  children: React.ReactNode;
}) {
  const { user, isAuthed, loading } = useAuth();
  const location = useLocation();
  const isExploreMap = location.pathname.startsWith('/app/explore');
  const isPublicUserSurface = isExploreMap;
  const firstRole = roles[0] ?? 'user';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="animate-pulse rounded-2xl border border-slate-800 px-4 py-3 text-sm font-semibold">
          Checking permissions...
        </div>
      </div>
    );
  }

  if (!isAuthed || !user) {
    const target =
      firstRole === 'admin' ? '/adminlogin' : firstRole === 'agent' ? '/agentlogin' : '/login';
    // Always require auth: redirect to login and preserve intended destination so user can sign in then land there
    return <Navigate to={target} replace state={{ from: location }} />;
  }

  // Allow any authenticated role to view the public explore/home surface
  if (isPublicUserSurface) {
    return <>{children}</>;
  }

  if (!roles.includes(user.role)) {
    const target = redirectToRole ? homeFor(user.role) : '/';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
