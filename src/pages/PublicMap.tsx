import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PropertyMap } from '../components/PropertyMap';
import { properties as mockProperties, type Property } from '../utils/mockData';
import { Map as MapIcon, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';

export function PublicMapPage() {
  const navigate = useNavigate();
  const { isAuthed, user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Keep the public view light: show a curated subset
  const mapProps = useMemo<Property[]>(() => mockProperties.slice(0, 8), []);
  const selected = mapProps.find((p) => p.id === selectedId);

  const handleRequireAuth = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="flex items-center justify-between px-6 h-16 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold tracking-tight">ZENI<span className="text-green-500">.</span></div>
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-400">Public Map Preview</span>
        </div>
        <div className="flex items-center gap-3">
          {isAuthed ? (
            <button
              onClick={() => navigate('/app/explore?view=map')}
              className="border border-slate-900 px-4 py-2 text-[11px] font-bold uppercase tracking-widest hover:bg-slate-900 hover:text-white"
            >
              Open full app ({user?.name || 'Account'})
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="text-[11px] font-bold uppercase tracking-widest text-slate-700 hover:text-black"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/register')}
                className="bg-slate-900 text-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest hover:bg-slate-800"
              >
                Create account
              </button>
            </>
          )}
        </div>
      </header>

      <main className="relative h-[calc(100vh-4rem)]">
        <PropertyMap
          properties={mapProps}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
        />

        {/* Floating card prompting auth when a marker is selected */}
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center md:justify-start md:items-start p-4">
          <div className={`transition-all ${selected ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} pointer-events-auto max-w-sm w-full md:w-96`}>
            <div className="rounded-xl border border-slate-200 bg-white shadow-xl">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-500">
                <Lock className="h-4 w-4" />
                Login required for details
              </div>
              <div className="p-4 space-y-2">
                {selected ? (
                  <>
                    <div className="text-sm font-semibold text-slate-900">{selected.title}</div>
                    <div className="text-xs text-slate-500">{selected.location.city}</div>
                    <div className="text-sm font-mono text-slate-800">
                      {selected.currency} {selected.price.toLocaleString()}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-600">Tap a marker to preview a listing.</div>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleRequireAuth}
                    className="flex-1 bg-slate-900 text-white px-4 py-2 text-[11px] font-bold uppercase tracking-widest hover:bg-slate-800"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="flex-1 border border-slate-300 px-4 py-2 text-[11px] font-bold uppercase tracking-widest hover:border-slate-900"
                  >
                    Create account
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">Create an account to view full details, photos, and schedule viewings.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 z-[10] inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest shadow border border-slate-200 hover:bg-white"
        >
          <MapIcon className="h-4 w-4" /> Back to landing
        </button>
      </main>
    </div>
  );
}
