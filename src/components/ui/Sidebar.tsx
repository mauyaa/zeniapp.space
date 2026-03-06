import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';
import { LogOut } from 'lucide-react';

/**
 * Enhanced Sidebar with animations and better visual hierarchy
 */

interface SidebarLink {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

type SidebarVariant = 'dark' | 'light';

interface SidebarProps {
  links: SidebarLink[];
  title?: string;
  logo?: React.ReactNode;
  onLogout?: () => void;
  showIcons?: boolean;
  variant?: SidebarVariant;
}

export function Sidebar({
  links,
  title = 'ZENI',
  logo,
  onLogout,
  showIcons = false,
  variant = 'dark',
}: SidebarProps) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  const isDark = variant === 'dark';
  const bgClass = isDark
    ? 'bg-slate-950/95 border-slate-800/50 text-slate-100'
    : 'bg-white border-slate-200 text-slate-800';
  const headerBorder = isDark ? 'border-slate-800/50' : 'border-slate-200';
  const subText = isDark ? 'text-slate-500' : 'text-slate-400';
  const activeText = isDark ? 'text-slate-100' : 'text-emerald-700';
  const inactiveText = isDark
    ? 'text-slate-400 hover:text-slate-100'
    : 'text-slate-500 hover:text-slate-900';
  const activeBorder = isDark ? 'border-emerald-300' : 'border-emerald-500';
  const footerBorder = isDark ? 'border-slate-800/50' : 'border-slate-200';

  return (
    <motion.aside
      initial={reduceMotion ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.4 }}
      className={clsx('hidden w-64 flex-col border-r backdrop-blur-xl lg:flex', bgClass)}
    >
      {/* Header */}
      <div className={clsx('flex flex-col gap-1 border-b px-4 py-5', headerBorder)}>
        {logo || (
          <div
            className={clsx(
              'text-2xl font-heading font-semibold tracking-tight',
              isDark ? 'text-slate-100' : 'text-slate-900'
            )}
          >
            {title}
          </div>
        )}
        <div className={clsx('text-[11px] uppercase tracking-[0.3em]', subText)}>Admin</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {links.map((link, index) => {
          const isActive =
            location.pathname === link.to || location.pathname.startsWith(`${link.to}/`);

          return (
            <NavLink key={link.to} to={link.to} className="relative block">
              <motion.div
                initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: reduceMotion ? 0 : index * 0.05,
                  duration: reduceMotion ? 0 : 0.2,
                }}
                className={clsx(
                  'group flex items-center py-3 text-sm tracking-wide transition-all duration-300',
                  showIcons ? 'gap-3' : 'gap-0',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                  isActive
                    ? clsx(activeText, 'font-medium border-l-2', activeBorder, 'pl-4')
                    : clsx(inactiveText, 'pl-0 hover:pl-2')
                )}
              >
                {showIcons && <link.icon className="h-4 w-4 text-current" />}
                <span className="flex-1">{link.label}</span>

                {/* Badge */}
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="relative z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                    {link.badge > 99 ? '99+' : link.badge}
                  </span>
                )}
              </motion.div>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      {onLogout && (
        <div className={clsx('border-t p-3', footerBorder)}>
          <motion.button
            whileHover={reduceMotion ? undefined : { scale: 1.01 }}
            whileTap={reduceMotion ? undefined : { scale: 0.99 }}
            onClick={onLogout}
            className={clsx(
              'flex w-full items-center gap-3 py-3 text-sm font-medium transition',
              isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </motion.button>
        </div>
      )}

      {/* Gradient accent */}
      <div
        className={clsx(
          'absolute right-0 top-0 h-full w-px',
          isDark
            ? 'bg-gradient-to-b from-emerald-500/30 via-transparent to-emerald-500/30'
            : 'bg-gradient-to-b from-emerald-300/40 via-transparent to-emerald-300/40'
        )}
      />
    </motion.aside>
  );
}

/**
 * Mobile sidebar drawer
 */
interface MobileSidebarProps extends SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose, ...props }: MobileSidebarProps) {
  const reduceMotion = useReducedMotion();
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  // Focus trap: lock focus inside drawer when open
  React.useEffect(() => {
    if (!isOpen) {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !drawerRef.current) return;

      const focusables = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;

      if (e.shiftKey) {
        if (current === first || !drawerRef.current.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (current === last || !drawerRef.current.contains(current)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Auto-focus first focusable element
    requestAnimationFrame(() => {
      if (drawerRef.current) {
        const first = drawerRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        first?.focus();
      }
    });

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Sidebar */}
          <motion.div
            ref={drawerRef}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={
              reduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 300 }
            }
            className="absolute inset-y-0 left-0 w-72"
          >
            <Sidebar {...props} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
