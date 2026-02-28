import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  MapPin,
  BedDouble,
  Bath,
  Maximize2,
  ShieldCheck,
  AlertTriangle,
  FileDown,
  BookOpen,
} from 'lucide-react';
import type { Property } from '../../../utils/mockData';
import { formatCurrency } from '../../../lib/format';

interface DrawerPropertyInfoProps {
  property: Property;
}

export const DrawerPropertyInfo = React.memo(function DrawerPropertyInfo({
  property,
}: DrawerPropertyInfoProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduceMotion ? 0 : 0.2, duration: reduceMotion ? 0 : 0.2 }}
      className="space-y-3"
    >
      {/* Title and price */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-900">{property.title}</h3>
          <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
            <MapPin className="h-4 w-4" />
            {property.location.neighborhood}, {property.location.city}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-emerald-700">
            {formatCurrency(property.price, property.currency)}
          </div>
          {property.isVerified && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified
            </motion.div>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-sm text-slate-700">
          <BedDouble className="h-4 w-4 text-slate-500" />
          {property.features.bedrooms} {property.features.bedrooms === 1 ? 'Bed' : 'Beds'}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-sm text-slate-700">
          <Bath className="h-4 w-4 text-slate-500" />
          {property.features.bathrooms} {property.features.bathrooms === 1 ? 'Bath' : 'Baths'}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-sm text-slate-700">
          <Maximize2 className="h-4 w-4 text-slate-500" />
          {property.features.sqm} m2
        </span>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed text-slate-600">
        Spacious, well-lit unit close to amenities. Move-in ready with modern finishes and ample
        natural light throughout.
      </p>

      {/* More info: floor plans & catalogue */}
      {(property.floorPlans?.length || property.catalogueUrl) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <FileDown className="h-4 w-4" />
            More info
          </div>

          {property.floorPlans?.length ? (
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-[0.18em] text-amber-700 font-semibold">
                Floor plans
              </div>
              {property.floorPlans.map(
                (plan: { label: string; url: string; size?: string }, idx: number) => (
                  <a
                    key={`${plan.url}-${idx}`}
                    href={plan.url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm text-amber-900 transition hover:bg-amber-100"
                  >
                    <span className="flex items-center gap-2">
                      <FileDown className="h-4 w-4" />
                      {plan.label}
                    </span>
                    {plan.size && (
                      <span className="text-[11px] text-amber-600">{plan.size}</span>
                    )}
                  </a>
                )
              )}
            </div>
          ) : (
            <p className="text-xs text-amber-800">No floor plans uploaded yet.</p>
          )}

          {property.catalogueUrl ? (
            <a
              href={property.catalogueUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow hover:bg-emerald-700 transition"
            >
              <BookOpen className="h-4 w-4" />
              Open catalogue
            </a>
          ) : (
            <p className="text-xs text-amber-800">No catalogue provided.</p>
          )}
        </div>
      )}

      {/* Safety warning */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.25, duration: reduceMotion ? 0 : 0.2 }}
        className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3"
      >
        <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
        <p className="text-xs leading-relaxed text-amber-800">
          Never pay cash before viewing. Use in-app messaging to coordinate safely.
        </p>
      </motion.div>
    </motion.div>
  );
});
