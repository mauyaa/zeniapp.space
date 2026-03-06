import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import type { Property } from '../../../utils/mockData';

interface DrawerAgentCardProps {
  property: Property;
  onMessage?: (property: Property) => void;
}

export const DrawerAgentCard = React.memo(function DrawerAgentCard({
  property,
  onMessage,
}: DrawerAgentCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduceMotion ? 0 : 0.3, duration: reduceMotion ? 0 : 0.2 }}
      className="space-y-3 rounded-2xl border border-[#E9E2D8] bg-gradient-to-br from-[#F7F2EA] to-[#FFFBF7] p-4"
    >
      <h4 className="text-sm font-semibold text-slate-800 font-display tracking-wide">Listed by</h4>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={property.agent.image}
            alt={property.agent.name}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-[#FFFBF7]"
          />
          <div>
            <div className="font-semibold text-slate-900">{property.agent.name}</div>
            <div className="text-xs text-slate-500">Property Agent</div>
          </div>
        </div>
        <div className="flex gap-2">
          {onMessage && (
            <motion.button
              whileHover={reduceMotion ? undefined : { scale: 1.05 }}
              whileTap={reduceMotion ? undefined : { scale: 0.95 }}
              onClick={() => onMessage(property)}
              className="rounded-full bg-emerald-100 p-2.5 text-emerald-700 transition hover:bg-emerald-200"
              aria-label="Message agent"
            >
              <MessageCircle className="h-4 w-4" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
});
