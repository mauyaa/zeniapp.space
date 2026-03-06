import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarClock, Send, CheckCircle, Clock, AlertCircle } from 'lucide-react';

/**
 * Enhanced ViewingRequestForm with better UX
 */

interface ViewingRequestFormProps {
  onSubmit?: (payload: { date: string; note?: string }) => Promise<void> | void;
  listingTitle?: string;
}

export function ViewingRequestForm({ onSubmit, listingTitle }: ViewingRequestFormProps) {
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [touched, setTouched] = useState(false);

  // Minimum = tomorrow 00:00 local (so any time tomorrow is valid, e.g. 7:50 AM)
  const now = new Date();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const y = tomorrowStart.getFullYear();
  const m = String(tomorrowStart.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrowStart.getDate()).padStart(2, '0');
  const minDateStr = `${y}-${m}-${d}T00:00`;

  // Validate: must be at or after tomorrow 00:00 local
  const selected = date ? new Date(date) : null;
  const isValidDate = selected != null && selected.getTime() >= tomorrowStart.getTime();
  const showDateError = touched && date !== '' && !isValidDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidDate) {
      setTouched(true);
      return;
    }

    setStatus('submitting');

    try {
      await onSubmit?.({ date, note });
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const handleReset = () => {
    setDate('');
    setNote('');
    setStatus('idle');
    setTouched(false);
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-[#E9E2D8] bg-gradient-to-b from-[#FFFBF7] to-[#F7F2EA] p-4 shadow-[0_12px_30px_rgba(17,24,39,0.06)]"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
          <CalendarClock className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800 font-display tracking-wide">
            Schedule a Viewing
          </h3>
          {listingTitle && <p className="text-xs text-slate-500 line-clamp-1">{listingTitle}</p>}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-3 py-4 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Request Sent!</p>
              <p className="text-xs text-slate-500">The agent will respond within 24 hours</p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
            >
              Schedule another viewing
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-3"
          >
            {/* Date input */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <Clock className="h-3.5 w-3.5" />
                Preferred Date & Time
              </label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onBlur={() => setTouched(true)}
                min={minDateStr}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                  showDateError
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                    : 'border-[#E9E2D8] focus:border-amber-400 focus:ring-amber-200/60'
                }`}
                required
                aria-invalid={showDateError}
                aria-describedby={showDateError ? 'date-error' : undefined}
              />
              <AnimatePresence>
                {showDateError && (
                  <motion.p
                    id="date-error"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-center gap-1 text-xs text-red-600"
                  >
                    <AlertCircle className="h-3 w-3" />
                    Please choose a date and time from tomorrow onward
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Note input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Note <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full resize-none rounded-xl border border-[#E9E2D8] px-3 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200/60 focus:ring-offset-0"
                rows={2}
                placeholder="Any specific requests or questions?"
                maxLength={500}
              />
              <p className="text-right text-[10px] text-slate-400">{note.length}/500</p>
            </div>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={status === 'submitting'}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === 'submitting' ? (
                <>
                  <motion.div
                    className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Request
                </>
              )}
            </motion.button>

            {/* Error state */}
            <AnimatePresence>
              {status === 'error' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-xs text-red-600"
                >
                  Something went wrong. Please try again.
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.form>
  );
}
