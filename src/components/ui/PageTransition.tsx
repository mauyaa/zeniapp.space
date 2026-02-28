/* eslint-disable react-refresh/only-export-components -- exports animation config for reuse */
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Snappier transition — 180ms feels instant while still providing visual continuity.
 * The custom cubic-bezier gives a quick start with a soft ease-out.
 */
const defaultTransition = { type: 'tween', duration: 0.18, ease: [0.25, 0.1, 0.25, 1] };

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  /** Optional custom key - defaults to none (parent should pass location.pathname) */
  layout?: boolean;
}

/**
 * Wraps page content for route transitions. Use with AnimatePresence and a key on the parent.
 * Respects prefers-reduced-motion. Uses GPU-accelerated opacity + translateY for smoothness.
 */
export function PageTransition({ children, className, layout }: PageTransitionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      layout={layout}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? false : { opacity: 0, y: -4 }}
      transition={defaultTransition}
      className={className}
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger container for list children - use with staggerChildren on parent.
 */
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.03 },
  },
  exit: { opacity: 0 },
};

/**
 * Stagger item - use with staggerContainer.
 */
export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'tween', duration: 0.15, ease: [0.25, 0.1, 0.25, 1] } },
};
