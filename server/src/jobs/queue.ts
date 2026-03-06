/**
 * Pluggable job queue. Default in-process; replace with BullMQ/Redis for production scaling.
 * Usage: addJob('saved_search_alerts', {}); then run worker or cron that processes the queue.
 */
export type JobType =
  | 'saved_search_alerts'
  | 'email'
  | 'notification'
  | 'pay_reconcile'
  | 'audit_forward';

export interface JobPayload {
  type: JobType;
  payload: Record<string, unknown>;
  id?: string;
}

const inProcessQueue: JobPayload[] = [];
const listeners: Array<(job: JobPayload) => void> = [];

export function addJob(type: JobType, payload: Record<string, unknown>, id?: string): void {
  const job: JobPayload = { type, payload, id };
  inProcessQueue.push(job);
  listeners.forEach((fn) => {
    try {
      fn(job);
    } catch (err) {
      console.error('[queue] listener error', err);
    }
  });
}

export function onJob(callback: (job: JobPayload) => void): () => void {
  listeners.push(callback);
  return () => {
    const i = listeners.indexOf(callback);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export function getPendingJobs(): JobPayload[] {
  return [...inProcessQueue];
}

export function clearPendingJobs(): void {
  inProcessQueue.length = 0;
}
