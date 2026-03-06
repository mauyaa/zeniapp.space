/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../lib/api';
import type { NotificationDto } from '../lib/api/notifications';
import { useAuth } from './AuthProvider';
import { getSocket } from '../lib/socket';

type Notification = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  read: boolean;
  type?: 'message' | 'viewing' | 'system';
};

interface NotificationContextValue {
  notifications: Notification[];
  unread: number;
  push: (note: Omit<Notification, 'id' | 'createdAt' | 'read'> & { id?: string }) => void;
  markAllRead: () => void;
  markOne: (id: string) => void;
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

function toNotificationDto(note: NotificationDto): Notification {
  return {
    id: note._id || note.id || `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: note.title || 'Notification',
    description: note.description,
    type:
      note.type === 'message' || note.type === 'viewing' || note.type === 'system'
        ? note.type
        : undefined,
    createdAt: note.createdAt || new Date().toISOString(),
    read: Boolean(note.read),
  };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      setNotifications([]);
      return;
    }

    // Defer the API fetch so it doesn't block first paint.
    // Socket listener is set up immediately so real-time notifications still arrive.
    const fetchNotifications = () => {
      setLoading(true);
      listNotifications()
        .then((items) => {
          const mapped: Notification[] = (items ?? []).map(toNotificationDto);
          setNotifications(mapped);
        })
        .catch(() => undefined)
        .finally(() => setLoading(false));
    };

    let cleanupIdle: (() => void) | undefined;
    if ('requestIdleCallback' in window) {
      const id = (
        window as unknown as {
          requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback(fetchNotifications, { timeout: 2000 });
      cleanupIdle = () =>
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
    } else {
      const t = setTimeout(fetchNotifications, 100);
      cleanupIdle = () => clearTimeout(t);
    }

    const s = getSocket(token);
    const onNotification = (n: {
      _id?: string;
      id?: string;
      title: string;
      description?: string;
      type?: string;
      createdAt?: string;
      read?: boolean;
    }) => {
      setNotifications((prev) => [toNotificationDto(n), ...prev].slice(0, 50));
    };
    s.on('notification:new', onNotification);
    return () => {
      cleanupIdle?.();
      s.off('notification:new', onNotification);
    };
  }, [token]);

  const push = (note: Omit<Notification, 'id' | 'createdAt' | 'read'> & { id?: string }) => {
    const id = note.id || `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setNotifications((prev) =>
      [{ ...note, id, createdAt: new Date().toISOString(), read: false }, ...prev].slice(0, 50)
    );
  };

  const markAllRead = () => {
    markAllNotificationsRead().catch(() => undefined);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markOne = (id: string) => {
    markNotificationRead(id).catch(() => undefined);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const unread = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value = useMemo(
    () => ({ notifications, unread, push, markAllRead, markOne, loading }),
    [notifications, unread, loading]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
