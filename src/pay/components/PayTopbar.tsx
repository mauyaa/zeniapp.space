import React from 'react';
import { usePayAuth } from '../PayAuthContext';

export function PayTopbar({
  onMenuClick,
  title,
  subtitle = 'Encrypted • Real-time',
}: {
  onMenuClick: () => void;
  title: string;
  subtitle?: string;
}) {
  const { user } = usePayAuth();
  const initial = user?.name?.slice(0, 1).toUpperCase() || 'U';
  const roleLabel =
    user?.role === 'user' ? 'Tenant' : user?.role === 'agent' ? 'Agent' : user?.role || 'User';
  const unitLabel = user?.role === 'user' ? 'Unit 4B' : '';

  return (
    <header className="h-20 border-b border-zinc-800 flex items-center justify-between px-6 lg:px-10 flex-shrink-0 bg-[#09090B]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:text-white hover:border-zinc-600 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-serif text-white">{title}</h1>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-white uppercase">{user?.name || 'User'}</p>
          <p className="text-[10px] text-zinc-500">
            {roleLabel}
            {unitLabel ? ` • ${unitLabel}` : ''}
          </p>
        </div>
        <div className="w-8 h-8 bg-zinc-800 rounded-sm flex items-center justify-center text-xs font-serif italic border border-zinc-700">
          {initial}
        </div>
      </div>
    </header>
  );
}
