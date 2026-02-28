import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Compass, MessageSquare, Bookmark, CalendarClock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/cn';

const STORAGE_KEY = 'zeni_onboarding_dismissed';

const steps = [
  {
    icon: Compass,
    title: 'Explore Listings',
    desc: 'Browse verified properties on an interactive map.',
    action: '/app/explore',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    icon: Bookmark,
    title: 'Save Favorites',
    desc: 'Bookmark listings to compare later.',
    action: '/app/saved',
    color: 'bg-amber-100 text-amber-700',
  },
  {
    icon: CalendarClock,
    title: 'Schedule Viewings',
    desc: 'Request in-person visits with agents.',
    action: '/app/viewings',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    icon: MessageSquare,
    title: 'Message Agents',
    desc: 'Chat securely with verified agents.',
    action: '/app/messages',
    color: 'bg-purple-100 text-purple-700',
  },
];

/**
 * Onboarding banner shown to first-time users.
 * Dismissible and persisted in localStorage.
 */
export function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(true);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === 'true');
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // storage blocked
    }
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.section
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
        className="mb-8 rounded-xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-6 shadow-sm"
        aria-label="Getting started guide"
        role="region"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-serif font-semibold text-zeni-foreground">Welcome to Zeni</h2>
            <p className="text-sm text-zinc-600 mt-0.5">Here's how to get started with your property search.</p>
          </div>
          <button
            onClick={handleDismiss}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            aria-label="Dismiss getting started guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <button
                key={step.title}
                type="button"
                onClick={() => {
                  navigate(step.action);
                  handleDismiss();
                }}
                className={cn(
                  'flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-left',
                  'hover:border-zinc-300 hover:shadow-sm transition-all',
                  'focus-visible:ring-2 focus-visible:ring-zeni-foreground focus-visible:ring-offset-2',
                  'group'
                )}
              >
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0', step.color)}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zeni-foreground flex items-center gap-1">
                    {step.title}
                    <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" aria-hidden="true" />
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{step.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
