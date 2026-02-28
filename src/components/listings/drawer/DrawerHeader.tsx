import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { X, Share2, Heart } from 'lucide-react';
import type { Property } from '../../../utils/mockData';

interface DrawerHeaderProps {
  property: Property;
  isSaved: boolean;
  onClose: () => void;
  onShare?: (property: Property) => void;
  onSave?: (property: Property) => void;
}

export const DrawerHeader = React.memo(function DrawerHeader({
  property,
  isSaved,
  onClose,
  onShare,
  onSave,
}: DrawerHeaderProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduceMotion ? 0 : 0.1, duration: reduceMotion ? 0 : 0.2 }}
      className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E9E2D8] bg-[#FFFBF7]/95 px-4 py-3 backdrop-blur"
    >
      <h2
        id="drawer-title"
        className="text-base font-semibold text-slate-900 font-display tracking-wide"
      >
        Listing Details
      </h2>
      <div className="flex items-center gap-2">
        {onShare && (
          <motion.button
            whileHover={reduceMotion ? undefined : { scale: 1.05 }}
            whileTap={reduceMotion ? undefined : { scale: 0.95 }}
            onClick={() => onShare(property)}
            className="rounded-full p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
            aria-label="Share listing"
          >
            <Share2 className="h-5 w-5" />
          </motion.button>
        )}
        {onSave && (
          <motion.button
            whileHover={reduceMotion ? undefined : { scale: 1.05 }}
            whileTap={reduceMotion ? undefined : { scale: 0.95 }}
            onClick={() => onSave(property)}
            className={`rounded-full p-2 ${
              isSaved
                ? 'bg-rose-50 text-rose-500'
                : 'text-slate-500 hover:bg-amber-50 hover:text-amber-700'
            }`}
            aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
          >
            <Heart className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
          </motion.button>
        )}
        <motion.button
          whileHover={reduceMotion ? undefined : { scale: 1.05 }}
          whileTap={reduceMotion ? undefined : { scale: 0.95 }}
          onClick={onClose}
          className="rounded-full p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
          aria-label="Close drawer"
        >
          <X className="h-5 w-5" />
        </motion.button>
      </div>
    </motion.div>
  );
});
