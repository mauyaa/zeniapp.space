import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Megaphone, Building2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { fetchAgentListings, type AgentListing } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

export function BoostPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listings, setListings] = useState<AgentListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAgentListings()
      .then(setListings)
      .catch(() => setListings([]))
      .finally(() => setIsLoading(false));
  }, []);

  const activeListings = listings.filter(
    (l) => l.status !== 'draft' && l.availabilityStatus !== 'sold' && l.availabilityStatus !== 'let'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedId) {
      push({
        title: 'Campaign requested',
        description: 'We’ll contact you to set up your promotion.',
        tone: 'success',
      });
      navigate('/agent/dashboard');
    } else {
      push({
        title: 'Select a listing',
        description: 'Choose a listing to promote.',
        tone: 'error',
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <button
        type="button"
        onClick={() => navigate('/agent/dashboard')}
        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        Back to dashboard
      </button>

      <div className="bg-black text-white p-8 rounded-lg border border-black">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-medium">Boost your reach</h1>
            <p className="text-sm text-zinc-400">
              Promote your listings to top-tier tenants and increase visibility.
            </p>
          </div>
        </div>
        <p className="text-sm text-zinc-400">
          Select a listing below and we’ll help you run a targeted campaign. Campaigns can include
          featured placement in Explore and notifications to matching tenants.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-lg p-6 space-y-6"
      >
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">
            Choose a listing to promote
          </label>
          {isLoading ? (
            <div className="h-24 bg-gray-100 rounded animate-pulse" />
          ) : activeListings.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">
              You have no active listings. Create one from Listings first.
            </p>
          ) : (
            <div className="space-y-2">
              {activeListings.map((l) => (
                <label
                  key={l._id}
                  className={`flex items-center gap-3 p-4 min-h-[56px] rounded-lg border cursor-pointer transition-colors touch-manipulation ${
                    selectedId === l._id
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="listing"
                    value={l._id}
                    checked={selectedId === l._id}
                    onChange={() => setSelectedId(l._id)}
                    className="sr-only"
                  />
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-200 text-gray-600 flex-shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-black truncate">{l.title}</p>
                    <p className="text-xs text-gray-500">
                      {l.currency} {Number(l.price).toLocaleString()}
                      {(l.purpose === 'rent' ||
                        (l.category || '').toLowerCase().includes('rent')) &&
                        ' per month'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={!selectedId || activeListings.length === 0}>
            Start campaign
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/agent/dashboard')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
