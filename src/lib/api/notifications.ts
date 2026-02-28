/**
 * Notifications API — list, read, preferences.
 */

import { request } from './client';

export function listNotifications(limit = 50) {
  return request(`/notifications?limit=${limit}`);
}

export function markAllNotificationsRead() {
  return request('/notifications/mark-all', { method: 'POST' });
}

export function markNotificationRead(id: string) {
  return request(`/notifications/${id}/read`, { method: 'POST' });
}

export function fetchNotificationPrefs() {
  return request<{
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    quietHours?: { start: string; end: string };
  }>('/notifications/prefs');
}

export function updateNotificationPrefs(prefs: {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  quietHours?: { start: string; end: string };
}) {
  return request('/notifications/prefs', { method: 'PUT', body: JSON.stringify(prefs) });
}
