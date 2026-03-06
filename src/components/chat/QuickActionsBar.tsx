import React from 'react';
import { CalendarClock, PhoneCall, DollarSign, Video } from 'lucide-react';

const actions = [
  { id: 'schedule', label: 'Schedule viewing', icon: CalendarClock },
  { id: 'callback', label: 'Request callback', icon: PhoneCall },
  { id: 'fees', label: 'Ask about fees', icon: DollarSign },
  { id: 'video', label: 'Request video tour', icon: Video },
];

export function QuickActionsBar({ onAction }: { onAction: (id: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#E9E2D8] bg-[#FFFBF7]/90 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:border-slate-800/80 dark:bg-[#0F1914]/70 dark:text-slate-200 dark:hover:border-amber-500/50"
          >
            <Icon className="h-4 w-4" />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
