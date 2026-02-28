import React, { useState, useEffect, useRef } from 'react';
import { X, Flag, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { reportListing } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

interface ReportListingModalProps {
    listingId: string;
    listingTitle?: string;
    open: boolean;
    onClose: () => void;
}

const CATEGORIES = [
    { value: 'scam', label: '🚨 Scam / Fraud', desc: 'Fake listing or impersonation' },
    { value: 'misleading', label: '📸 Misleading info', desc: 'Wrong photos, location, or details' },
    { value: 'duplicate', label: '🔁 Duplicate listing', desc: 'Same property posted multiple times' },
    { value: 'bait', label: '💰 Bait pricing', desc: 'Advertised price differs from actual' },
    { value: 'inappropriate', label: '⚠️ Inappropriate content', desc: 'Offensive or harmful content' },
    { value: 'other', label: '💬 Other', desc: '' },
] as const;

type CategoryValue = typeof CATEGORIES[number]['value'];

export function ReportListingModal({ listingId, listingTitle, open, onClose }: ReportListingModalProps) {
    const [category, setCategory] = useState<CategoryValue>('scam');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const { push } = useToast();
    const firstBtnRef = useRef<HTMLButtonElement>(null);

    // Focus first option when opened and handle Escape
    useEffect(() => {
        if (!open) { setSubmitted(false); setMessage(''); setCategory('scam'); return; }
        const t = setTimeout(() => firstBtnRef.current?.focus(), 50);
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => { clearTimeout(t); document.removeEventListener('keydown', handleKey); };
    }, [open, onClose]);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            await reportListing(listingId, { category, message: message.trim() || undefined });
            setSubmitted(true);
            push({ title: 'Report submitted', description: "We'll review this listing within 24 hours.", tone: 'success' });
            setTimeout(() => onClose(), 1800);
        } catch {
            push({ title: 'Report failed', description: 'Please try again.', tone: 'error' });
        } finally {
            setSubmitting(false);
        }
    };


    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm"
                        aria-hidden
                        onClick={onClose}
                    />
                    {/* Panel */}
                    <motion.div
                        key="panel"
                        initial={{ opacity: 0, scale: 0.97, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 12 }}
                        transition={{ duration: 0.2 }}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Report this listing"
                        className="fixed inset-0 z-[1001] flex items-center justify-center p-4"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
                                <div className="flex items-center gap-2 text-zinc-900">
                                    <Flag className="w-4 h-4 text-red-500" />
                                    <span className="font-semibold text-sm">Report listing</span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="text-zinc-400 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 rounded-lg p-1"
                                    aria-label="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {submitted ? (
                                <div className="px-5 py-10 text-center space-y-2">
                                    <span className="text-3xl">✅</span>
                                    <p className="font-semibold text-zinc-900">Thanks for the report</p>
                                    <p className="text-sm text-zinc-500">Our team will review this listing shortly.</p>
                                </div>
                            ) : (
                                <div className="p-5 space-y-4">
                                    {listingTitle && (
                                        <p className="text-xs font-mono text-zinc-400 truncate">
                                            Reporting: <span className="text-zinc-600">{listingTitle}</span>
                                        </p>
                                    )}

                                    {/* Category picker */}
                                    <div className="grid grid-cols-1 gap-2">
                                        {CATEGORIES.map((cat, idx) => (
                                            <button
                                                key={cat.value}
                                                ref={idx === 0 ? firstBtnRef : undefined}
                                                onClick={() => setCategory(cat.value)}
                                                className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${category === cat.value
                                                    ? 'border-red-400 bg-red-50'
                                                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                                                    }`}
                                            >
                                                <div className="flex-shrink-0 mt-0.5">
                                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${category === cat.value ? 'border-red-500' : 'border-zinc-300'
                                                        }`}>
                                                        {category === cat.value && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-sm font-medium text-zinc-800">{cat.label}</span>
                                                    {cat.desc && <p className="text-xs text-zinc-400 mt-0.5">{cat.desc}</p>}
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Optional message */}
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                                            Additional details (optional)
                                        </label>
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            maxLength={500}
                                            rows={3}
                                            placeholder="Describe the issue..."
                                            className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-800 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300 resize-none"
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={onClose}
                                            className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                                        >
                                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                            Submit report
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
