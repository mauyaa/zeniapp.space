import React, { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCircle, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export function NotificationDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { notifications, markAllRead, markOne, loading } = useNotifications();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the close button when drawer opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Keyboard handler: Escape to close, Tab trap within drawer
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm"
          onClick={onClose}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Notifications panel${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="h-full w-full max-w-sm bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Bell className="h-4 w-4" aria-hidden="true" />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="inline-flex min-w-[1.2rem] items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead()}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-600 transition-colors"
                    aria-label="Mark all notifications as read"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div
              className="flex-1 overflow-y-auto custom-scroll"
              role="list"
              aria-label="Notification list"
            >
              {loading ? (
                <div className="divide-y" role="status" aria-label="Loading notifications">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={`ntf-skeleton-${idx}`} className="flex gap-3 px-4 py-3 animate-pulse">
                      <div className="mt-1 h-2 w-2 rounded-full bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-40 rounded bg-slate-200" />
                        <div className="h-3 w-28 rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                  <span className="sr-only">Loading notifications...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center" role="status">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Bell className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  </div>
                  <div className="mb-1 text-sm font-semibold text-slate-700">
                    You're all caught up
                  </div>
                  <p className="text-xs text-slate-500">Nothing to review right now.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="px-4 py-3 flex gap-3 hover:bg-slate-50 transition-colors"
                      role="listitem"
                      aria-label={`${n.read ? '' : 'Unread: '}${n.title}`}
                    >
                      <div
                        className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${n.read ? 'bg-slate-300' : 'bg-emerald-500'}`}
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{n.title}</div>
                        {n.description && (
                          <div className="text-xs text-slate-600 mt-0.5">{n.description}</div>
                        )}
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">
                          <time dateTime={n.createdAt}>
                            {new Date(n.createdAt).toLocaleString()}
                          </time>
                        </div>
                      </div>
                      {!n.read && (
                        <button
                          onClick={() => markOne(n.id)}
                          className="text-emerald-600 hover:text-emerald-500 flex-shrink-0 transition-colors"
                          aria-label={`Mark "${n.title}" as read`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
