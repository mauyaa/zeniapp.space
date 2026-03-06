import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, X, AlertTriangle, ShieldAlert, Ban, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

/**
 * Enhanced ReportButton with modal and category selection
 */

type ReportCategory = 'scam' | 'misleading' | 'inappropriate' | 'other';
type Severity = 'low' | 'medium' | 'high';

const categories: {
  value: ReportCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: 'scam', label: 'Scam / Fraud', icon: ShieldAlert },
  { value: 'misleading', label: 'Misleading Info', icon: AlertTriangle },
  { value: 'inappropriate', label: 'Inappropriate Content', icon: Ban },
  { value: 'other', label: 'Other Issue', icon: Flag },
];

interface ReportButtonProps {
  listingId: string;
  variant?: 'button' | 'text';
}

export function ReportButton({ listingId, variant = 'button' }: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [severity] = useState<Severity>('medium');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async () => {
    if (!category) return;

    setStatus('submitting');
    try {
      await api.reportListing(listingId, { category, severity, message });
      setStatus('success');
      setTimeout(() => {
        setIsOpen(false);
        // Reset after closing
        setTimeout(() => {
          setCategory(null);
          setMessage('');
          setStatus('idle');
        }, 300);
      }, 1500);
    } catch {
      setStatus('error');
    }
  };

  const handleClose = () => {
    if (status !== 'submitting') {
      setIsOpen(false);
      setTimeout(() => {
        setCategory(null);
        setMessage('');
        setStatus('idle');
      }, 300);
    }
  };

  return (
    <>
      {/* Trigger button */}
      {variant === 'button' ? (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setIsOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E9E2D8] bg-[#FFFBF7] px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
        >
          <Flag className="h-4 w-4" />
          Report listing
        </motion.button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="text-sm text-slate-500 hover:text-rose-600 transition-colors"
        >
          Report
        </button>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <AnimatePresence mode="wait">
                {status === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4 py-8 text-center"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                      <CheckCircle className="h-8 w-8 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Report Submitted</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Thank you for helping keep Zeni safe.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                          <Flag className="h-5 w-5 text-rose-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">Report Listing</h3>
                          <p className="text-xs text-slate-500">Help us maintain trust</p>
                        </div>
                      </div>
                      <button
                        onClick={handleClose}
                        className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Close"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Category selection */}
                    <div className="mt-6 space-y-3">
                      <p className="text-sm font-medium text-slate-700">What's the issue?</p>
                      <div className="grid grid-cols-2 gap-2">
                        {categories.map(({ value, label, icon: Icon }) => (
                          <button
                            key={value}
                            onClick={() => setCategory(value)}
                            className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left text-sm transition-all ${
                              category === value
                                ? 'border-rose-500 bg-rose-50 text-rose-700'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Additional details */}
                    <div className="mt-4 space-y-3">
                      <label className="block text-sm font-medium text-slate-700">
                        Additional details <span className="text-slate-400">(optional)</span>
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Provide any additional context..."
                        rows={3}
                        className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                        maxLength={500}
                      />
                    </div>

                    {/* Error message */}
                    {status === 'error' && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-3 text-sm text-rose-600"
                      >
                        Something went wrong. Please try again.
                      </motion.p>
                    )}

                    {/* Actions */}
                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={handleClose}
                        disabled={status === 'submitting'}
                        className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={handleSubmit}
                        disabled={!category || status === 'submitting'}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {status === 'submitting' ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Report'
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
