import React, { useEffect, useState } from 'react';
import {
  CloudUpload,
  ShieldCheck,
  FileText,
  AlertTriangle,
  CalendarClock,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import {
  uploadImage,
  submitVerificationEvidence,
  submitBusinessVerify,
  fetchVerificationHistory,
  updateEarbNumber,
} from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthProvider';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AGENT_ONBOARDING_PROTOCOL, AGENT_ACCEPTANCE_CRITERIA } from '../../constants/verification';

export function AgentVerificationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [earbNumber, setEarbNumber] = useState('');
  const [earbSaving, setEarbSaving] = useState(false);
  const [history, setHistory] = useState<{
    status: string;
    evidence: { url: string; note?: string; uploadedAt: string }[];
    earbRegistrationNumber?: string;
    earbVerifiedAt?: string;
    businessVerifyStatus?: string;
    businessVerifyEvidence?: { url: string; note?: string; uploadedAt?: string }[];
  } | null>(null);
  const [businessFile, setBusinessFile] = useState<File | null>(null);
  const [businessNote, setBusinessNote] = useState('');
  const [businessUploading, setBusinessUploading] = useState(false);
  const { push } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchVerificationHistory()
      .then((h) => {
        setHistory(h);
        if (h.earbRegistrationNumber) setEarbNumber(h.earbRegistrationNumber);
      })
      .catch(() => setHistory(null));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      push({ title: 'Select a file', description: 'Upload an ID or license image', tone: 'error' });
      return;
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      push({
        title: 'File too large',
        description: 'Documents must be 5MB or smaller.',
        tone: 'error',
      });
      return;
    }
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      push({
        title: 'Invalid file type',
        description: 'Use JPEG, PNG, WebP or GIF.',
        tone: 'error',
      });
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      await submitVerificationEvidence(url, note);
      push({ title: 'Uploaded', description: 'Evidence submitted for review', tone: 'success' });
      setFile(null);
      setNote('');
      const latest = await fetchVerificationHistory();
      setHistory(latest);
    } catch (err) {
      push({
        title: 'Failed',
        description: err instanceof Error ? err.message : 'Could not submit evidence',
        tone: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const statusLabel =
    user?.role === 'agent'
      ? user?.agentVerification === 'verified'
        ? 'Verified'
        : user?.agentVerification === 'rejected'
          ? 'Rejected'
          : history?.status || 'Pending review'
      : 'N/A';

  return (
    <div className="space-y-10 max-w-4xl">
      <div>
        <h1 className="text-3xl font-serif font-semibold text-zinc-900 tracking-tight">
          Agent verification
        </h1>
        <p className="text-base text-zinc-600 mt-2">
          You start as a user. Once your application and documents are accepted by our team, you
          become a verified agent and can list properties.
        </p>
      </div>

      {/* Protocol: User → Agent */}
      <section className="rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-6 md:p-8">
        <h2 className="text-sm font-mono font-semibold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          How you become an agent
        </h2>
        <ol className="space-y-4">
          {AGENT_ONBOARDING_PROTOCOL.map(({ step, title, description }) => (
            <li key={step} className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-mono text-sm font-semibold">
                {step}
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">{title}</h3>
                <p className="text-sm text-zinc-600 mt-0.5">{description}</p>
              </div>
              {step < AGENT_ONBOARDING_PROTOCOL.length && (
                <ArrowRight
                  className="h-5 w-5 shrink-0 text-zinc-300 mt-1 hidden sm:block"
                  aria-hidden
                />
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-500">
            Current status
          </div>
          <div className="text-xl font-semibold text-zinc-900 mt-2">{statusLabel}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-500">
            Evidence files
          </div>
          <div className="text-xl font-semibold text-zinc-900 mt-2">
            {history?.evidence?.length || 0}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm col-span-2 md:col-span-1">
          <div className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-500">
            Latest upload
          </div>
          <div className="text-xl font-semibold text-zinc-900 mt-2">
            {history?.evidence?.[0]?.uploadedAt
              ? new Date(history.evidence[0].uploadedAt).toLocaleDateString()
              : '—'}
          </div>
        </div>
      </div>

      {/* What admins check */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          What we verify before approving
        </h2>
        <ul className="text-sm text-zinc-600 space-y-2">
          {AGENT_ACCEPTANCE_CRITERIA.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* EARB */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6">
        <div className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          EARB registration
        </div>
        <p className="text-sm text-zinc-600 mb-4">
          Provide your Estate Agents Registration Board (EARB) license number. Admins verify it
          against the official EARB portal before approval.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-zinc-600 mb-1">
              EARB registration number
            </label>
            <Input
              type="text"
              value={earbNumber}
              onChange={(e) => setEarbNumber(e.target.value)}
              placeholder="e.g. EARB-12345"
              className="w-full"
            />
          </div>
          <Button
            type="button"
            disabled={earbSaving || !earbNumber.trim()}
            onClick={async () => {
              setEarbSaving(true);
              try {
                await updateEarbNumber(earbNumber.trim());
                push({ title: 'Saved', description: 'EARB number updated', tone: 'success' });
                const latest = await fetchVerificationHistory();
                setHistory(latest);
                if (latest.earbRegistrationNumber) setEarbNumber(latest.earbRegistrationNumber);
              } catch (err) {
                push({
                  title: 'Failed',
                  description: err instanceof Error ? err.message : 'Could not save',
                  tone: 'error',
                });
              } finally {
                setEarbSaving(false);
              }
            }}
          >
            {earbSaving ? 'Saving...' : 'Save EARB number'}
          </Button>
        </div>
        {history?.earbVerifiedAt && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            EARB verified {new Date(history.earbVerifiedAt).toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <p>
            Upload your license or ID and proof of agency. Reviews are usually completed within 1–2
            business days.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600 hover:border-emerald-500 hover:bg-emerald-50/30 transition-colors">
            <CloudUpload className="mb-2 h-6 w-6" />
            <span>{file ? file.name : 'Click to select an image (max 5MB)'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          <label className="block text-sm text-zinc-700">
            Notes (optional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              rows={3}
              placeholder="Anything the reviewer should know"
            />
          </label>

          <Button type="submit" disabled={uploading} leftIcon={<FileText className="h-4 w-4" />}>
            {uploading ? 'Submitting...' : 'Submit evidence'}
          </Button>
        </form>
      </div>

      {history && history.evidence?.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6 space-y-3">
          <div className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-500">
            Submission history
          </div>
          <div className="space-y-2">
            {history.evidence
              .slice()
              .reverse()
              .map((ev, idx) => (
                <div
                  key={`${ev.url}-${idx}`}
                  className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm"
                >
                  <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-200 text-zinc-600">
                    <CalendarClock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-zinc-500">
                      {new Date(ev.uploadedAt).toLocaleString()}
                    </div>
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-zinc-900 underline truncate block"
                    >
                      View document
                    </a>
                    {ev.note && <div className="text-xs text-zinc-600">Note: {ev.note}</div>}
                  </div>
                </div>
              ))}
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Status: {history.status}
          </div>
        </div>
      )}

      {/* Business verification */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-6">
        <div className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          Business verification
        </div>
        <p className="text-sm text-zinc-600 mb-4">
          Submit company or entity documents (e.g. business registration, agency license) for admin
          verification. Appears in the moderation queue as Business Verify.
        </p>
        {history?.businessVerifyStatus === 'verified' && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-4 w-4" />
            Business verified
          </div>
        )}
        {(history?.businessVerifyStatus === 'none' ||
          history?.businessVerifyStatus === 'pending' ||
          history?.businessVerifyStatus === 'rejected') && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!businessFile) {
                push({
                  title: 'Select a file',
                  description: 'Upload a business document image',
                  tone: 'error',
                });
                return;
              }
              const maxSize = 5 * 1024 * 1024; // 5MB
              if (businessFile.size > maxSize) {
                push({
                  title: 'File too large',
                  description: 'Documents must be 5MB or smaller.',
                  tone: 'error',
                });
                return;
              }
              if (!/^image\/(jpeg|png|webp|gif)$/i.test(businessFile.type)) {
                push({
                  title: 'Invalid file type',
                  description: 'Use JPEG, PNG, WebP or GIF.',
                  tone: 'error',
                });
                return;
              }
              setBusinessUploading(true);
              try {
                const { url } = await uploadImage(businessFile);
                await submitBusinessVerify(url, businessNote || undefined);
                push({
                  title: 'Submitted',
                  description: 'Business documents sent for review',
                  tone: 'success',
                });
                setBusinessFile(null);
                setBusinessNote('');
                const latest = await fetchVerificationHistory();
                setHistory(latest);
              } catch (err) {
                push({
                  title: 'Failed',
                  description: err instanceof Error ? err.message : 'Could not submit',
                  tone: 'error',
                });
              } finally {
                setBusinessUploading(false);
              }
            }}
            className="space-y-4"
          >
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-600 hover:border-emerald-500 hover:bg-emerald-50/30 transition-colors">
              <CloudUpload className="mb-2 h-6 w-6" />
              <span>
                {businessFile ? businessFile.name : 'Click to select a document image (max 5MB)'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setBusinessFile(e.target.files?.[0] || null)}
              />
            </label>
            <textarea
              value={businessNote}
              onChange={(e) => setBusinessNote(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              rows={2}
              placeholder="Note (optional)"
            />
            <Button
              type="submit"
              disabled={businessUploading}
              leftIcon={<FileText className="h-4 w-4" />}
            >
              {businessUploading ? 'Submitting...' : 'Submit business documents'}
            </Button>
          </form>
        )}
        {history?.businessVerifyEvidence?.length ? (
          <div className="mt-3 pt-3 border-t border-zinc-100">
            <p className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400 mb-2">
              Submitted
            </p>
            <div className="flex flex-wrap gap-2">
              {history.businessVerifyEvidence.map((ev, idx) => (
                <a
                  key={idx}
                  href={ev.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:border-emerald-500 hover:bg-emerald-50/30 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {ev.note || 'Document'}{' '}
                  {ev.uploadedAt ? `— ${new Date(ev.uploadedAt).toLocaleDateString()}` : ''}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default AgentVerificationPage;
