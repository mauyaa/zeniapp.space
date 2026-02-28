import React, { useEffect, useState } from 'react';
import { Bell, CircleCheck, Clock3, Shield } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import {
  getAgentAvailability,
  setAgentAvailability,
  fetchNotificationPrefs,
  updateNotificationPrefs,
  fetchPayoutChecklist,
  runTestPayout
} from '../../lib/api';

export function AgentSettingsPage() {
  const [availability, setAvailability] = useState<'active' | 'paused'>('active');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<{ email?: boolean; sms?: boolean; push?: boolean; quietHours?: { start: string; end: string } }>({});
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [payoutChecklist, setPayoutChecklist] = useState<{ items: { id: string; label: string; done: boolean }[] }>({ items: [] });
  const [payoutLoading, setPayoutLoading] = useState(false);

  useEffect(() => {
    getAgentAvailability()
      .then((res) => setAvailability(res.availability))
      .catch(() => setAvailability('active'))
      .finally(() => setLoading(false));

    fetchNotificationPrefs()
      .then(setPrefs)
      .catch(() => setPrefs({ email: true, sms: true, push: true }));

    fetchPayoutChecklist()
      .then(setPayoutChecklist)
      .catch(() => setPayoutChecklist({ items: [] }));
  }, []);

  const setAvailabilityRemote = async (next: 'active' | 'paused') => {
    setSaving(true);
    try {
      const res = await setAgentAvailability(next);
      setAvailability(res.availability);
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = () => {
    const next = availability === 'active' ? 'paused' : 'active';
    void setAvailabilityRemote(next);
  };

  const channelsOn = [prefs.email, prefs.sms, prefs.push].filter(Boolean).length;
  const payoutDone = payoutChecklist.items.filter((item) => item.done).length;
  const payoutTotal = payoutChecklist.items.length || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-black mb-2">Agent preferences</h1>
        <p className="text-sm text-gray-500">
          Configure availability, notifications, and payout readiness from one control panel.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Availability</div>
          <div className="text-2xl font-semibold text-black mt-1">{availability === 'active' ? 'Active' : 'Paused'}</div>
        </div>
        <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Notification channels</div>
          <div className="text-2xl font-semibold text-black mt-1">{channelsOn}</div>
        </div>
        <div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Payout checklist</div>
          <div className="text-2xl font-semibold text-black mt-1">{payoutDone}/{payoutTotal}</div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-sm border border-gray-200 bg-white shadow-sm space-y-4 p-5">
          <div>
            <div className="text-sm font-semibold text-black">Availability control</div>
            <div className="text-xs text-gray-500">
              Pause to hide and unlist your live inventory. Resume to re-publish listings.
            </div>
          </div>

          <div className="rounded-sm border border-gray-200 bg-gray-50 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-gray-200 text-gray-600">
                <Clock3 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-black">Status switch</div>
                <div className="text-xs text-gray-500">Use this before breaks or after office hours.</div>
              </div>
            </div>
            <span className="text-xs font-semibold text-black uppercase">{availability}</span>
            <Button
              size="sm"
              variant={availability === 'active' ? 'secondary' : 'outline'}
              loading={saving}
              disabled={loading}
              onClick={toggleAvailability}
            >
              {availability === 'active' ? 'Pause' : 'Resume'}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" loading={saving} onClick={() => setAvailabilityRemote('active')}>
              Set active
            </Button>
            <Button variant="outline" size="sm" loading={saving} onClick={() => setAvailabilityRemote('paused')}>
              Pause now
            </Button>
          </div>
        </div>

        <div className="rounded-sm border border-gray-200 bg-white shadow-sm space-y-4 p-5">
          <div>
            <div className="text-sm font-semibold text-black">Notification routing</div>
            <div className="text-xs text-gray-500">Choose channels and define quiet hours for off-duty periods.</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            {(['email', 'sms', 'push'] as const).map((channel) => {
              const enabled = prefs[channel] ?? true;
              return (
                <button
                  key={channel}
                  onClick={() => setPrefs((prev) => ({ ...prev, [channel]: !prev[channel] }))}
                  className={`rounded-sm border px-3 py-3 text-left transition-colors ${
                    enabled ? 'border-green-200 bg-green-50 text-green-800' : 'border-gray-200 bg-gray-50 text-gray-600'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{channel}</div>
                  <div className="mt-1 text-xs font-semibold">{enabled ? 'Enabled' : 'Disabled'}</div>
                </button>
              );
            })}
          </div>

          <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">Quiet hours</div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="time"
                value={prefs.quietHours?.start || '22:00'}
                onChange={(e) => setPrefs((p) => ({ ...p, quietHours: { ...(p.quietHours || {}), start: e.target.value } }))}
                className="rounded-sm border border-gray-200 bg-white px-2 py-1 text-gray-700"
              />
              <span className="text-gray-500">to</span>
              <input
                type="time"
                value={prefs.quietHours?.end || '06:00'}
                onChange={(e) => setPrefs((p) => ({ ...p, quietHours: { ...(p.quietHours || {}), end: e.target.value } }))}
                className="rounded-sm border border-gray-200 bg-white px-2 py-1 text-gray-700"
              />
              <Button
                size="sm"
                variant="secondary"
                loading={prefsSaving}
                onClick={async () => {
                  setPrefsSaving(true);
                  try {
                    const res = await updateNotificationPrefs(prefs);
                    setPrefs(res);
                  } finally {
                    setPrefsSaving(false);
                  }
                }}
              >
                Save prefs
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-sm border border-gray-200 bg-white shadow-sm space-y-4 p-5">
        <div>
          <div className="text-sm font-semibold text-black">Payout readiness</div>
          <div className="text-xs text-gray-500">Complete all items below to fully enable payout flows.</div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {payoutChecklist.items.map((item) => (
            <div key={item.id} className="rounded-sm border border-gray-200 bg-gray-50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-sm border ${
                    item.done ? 'border-green-200 bg-green-100 text-green-700' : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {item.done ? <CircleCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                </span>
                <span className={item.done ? 'text-gray-500 line-through' : 'text-gray-700'}>{item.label}</span>
              </div>
            </div>
          ))}
          {payoutChecklist.items.length === 0 && (
            <div className="rounded-sm border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
              No checklist available.
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            loading={payoutLoading}
            onClick={async () => {
              setPayoutLoading(true);
              try {
                const res = await runTestPayout();
                alert(`Test payout simulated. Ref: ${res.reference}`);
              } catch {
                alert('Test payout failed');
              } finally {
                setPayoutLoading(false);
              }
            }}
            leftIcon={<Bell className="h-3.5 w-3.5" />}
          >
            Run test payout
          </Button>
        </div>
      </div>
    </div>
  );
}
