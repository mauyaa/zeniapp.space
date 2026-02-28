import React from 'react';
import { X, BedDouble, Bath, MapPin, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Property } from '../../utils/mockData';
import { listingThumbUrl } from '../../lib/cloudinary';

interface CompareModalProps {
    properties: Property[];
    onRemove: (id: string) => void;
    onClose: () => void;
    open?: boolean;
}

function formatPrice(p: Property) {
    const base = p.currency.includes('/') ? p.currency.split('/')[0] : p.currency;
    const unit = p.purpose === 'rent' ? '/mo' : '';
    return `${base} ${p.price.toLocaleString()}${unit}`;
}

const ROWS: { label: string; get: (p: Property) => React.ReactNode }[] = [
    { label: 'Price', get: (p) => <span className="font-mono font-semibold">{formatPrice(p)}</span> },
    { label: 'Type', get: (p) => p.type || '—' },
    { label: 'Bedrooms', get: (p) => <span className="flex items-center gap-1.5"><BedDouble className="w-3.5 h-3.5 text-zinc-400" />{p.features.bedrooms || '—'}</span> },
    { label: 'Bathrooms', get: (p) => <span className="flex items-center gap-1.5"><Bath className="w-3.5 h-3.5 text-zinc-400" />{p.features.bathrooms || '—'}</span> },
    { label: 'Area', get: (p) => p.features.sqm ? `${p.features.sqm} m²` : '—' },
    { label: 'Location', get: (p) => <span className="flex items-center gap-1.5 text-xs"><MapPin className="w-3.5 h-3.5 text-zinc-400" />{[p.location.neighborhood, p.location.city].filter(Boolean).join(', ') || 'Kenya'}</span> },
    { label: 'Verified', get: (p) => p.isVerified ? <span className="flex items-center gap-1 text-emerald-700"><ShieldCheck className="w-3.5 h-3.5" />Yes</span> : <span className="text-zinc-400">No</span> },
    { label: 'Purpose', get: (p) => p.purpose === 'rent' ? 'For Rent' : 'For Sale' },
];

export function CompareModal({ properties, onRemove, onClose, open = true }: CompareModalProps) {
    const cols = properties.slice(0, 3);

    // Close on Escape
    React.useEffect(() => {
        if (!open || cols.length < 2) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose, open, cols.length]);

    return (
        <AnimatePresence>
            {open && cols.length >= 2 && (
                <>
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm"
                        aria-hidden
                        onClick={onClose}
                    />
                    <motion.div
                        key="panel"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 24 }}
                        transition={{ duration: 0.25 }}
                        className="fixed inset-4 md:inset-10 z-[1001] bg-white rounded-2xl shadow-2xl overflow-auto"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Compare listings"
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-sm font-mono uppercase tracking-widest text-zinc-700">
                                Compare {cols.length} listings
                            </h2>
                            <button
                                onClick={onClose}
                                className="text-zinc-400 hover:text-zinc-800 p-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                                aria-label="Close compare"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[580px]">
                                {/* Listing headers */}
                                <thead>
                                    <tr>
                                        <th className="w-28 md:w-36 text-left px-6 py-4 text-xs font-mono text-zinc-400 uppercase tracking-widest align-bottom">
                                            Feature
                                        </th>
                                        {cols.map((p) => (
                                            <th key={p.id} className="px-4 py-4 text-left align-top">
                                                <div className="space-y-2">
                                                    <div className="relative rounded-lg overflow-hidden aspect-[4/3] bg-zinc-100 w-full max-w-[180px]">
                                                        <img
                                                            src={listingThumbUrl(p.imageUrl, 300)}
                                                            alt={p.title}
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                        />
                                                        <button
                                                            onClick={() => onRemove(p.id)}
                                                            className="absolute top-1.5 right-1.5 bg-white/90 rounded-full p-1 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                            aria-label={`Remove ${p.title} from comparison`}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <p className="text-xs font-semibold text-zinc-800 line-clamp-2 max-w-[180px]">
                                                        {p.title}
                                                    </p>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {ROWS.map((row, rowIdx) => (
                                        <tr key={row.label} className={rowIdx % 2 === 0 ? 'bg-zinc-50/60' : 'bg-white'}>
                                            <td className="px-6 py-3 text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">
                                                {row.label}
                                            </td>
                                            {cols.map((p) => (
                                                <td key={p.id} className="px-4 py-3 text-sm text-zinc-800">
                                                    {row.get(p)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
