/**
 * Pluggable notification layer: one interface, multiple channels (email, SMS, push, in-app).
 * Implement send() for each channel; dispatch uses user preferences and channel availability.
 */
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';

export interface NotificationPayload {
  userId: string;
  title: string;
  description?: string;
  type?: string;
  /** Optional deep link or action URL */
  actionUrl?: string;
  /** Channel-specific overrides (e.g. sms: { to: '+254...' }) */
  channelPayload?: Partial<Record<NotificationChannel, Record<string, unknown>>>;
}

export interface INotificationSender {
  channel: NotificationChannel;
  send(payload: NotificationPayload): Promise<void>;
}
