import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Compass, LogIn } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <p className="text-6xl font-serif font-bold text-slate-300">404</p>
        <h1 className="text-2xl font-semibold text-slate-800">Page not found</h1>
        <p className="text-sm text-slate-500">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-black text-white px-5 py-2.5 text-sm font-semibold hover:bg-zinc-800 transition-colors"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Compass className="h-4 w-4" />
            Explore
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Login
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
