import type { Conversation } from '../../types/chat';

function normalize(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function isAdminSupportLabel(value?: string | null) {
  const v = normalize(value);
  return (
    v === 'zeni support' ||
    v === 'zeni admin' ||
    v === 'zei admin' ||
    v.includes('support') ||
    v.includes('admin')
  );
}

function isAgentLabel(value?: string | null) {
  const v = normalize(value);
  return v.includes('agent') || v.includes('alice') || v.includes('demo');
}

export function formatKnownContactLabel(name?: string | null): string {
  if (isAdminSupportLabel(name)) return 'Zeni Admin';
  if (isAgentLabel(name)) return 'Zeni Agent';
  return 'Zeni Agent';
}

/**
 * For the user inbox: resolve the agent-side name to either "Zeni Agent" or "Zeni Admin".
 */
export function resolveUserContactLabel(name?: string | null): string {
  if (isAdminSupportLabel(name)) return 'Zeni Admin';
  if (isAgentLabel(name)) return 'Zeni Agent';
  return name?.trim() || 'Zeni Agent';
}

/** Agent inbox/thread: show the user's actual name, or "Zeni Admin" for admin contacts. */
export function getAgentOtherPartyLabel(conversation: Conversation): string {
  if (conversation.userSnapshot?.role === 'admin') return 'Zeni Admin';
  if (conversation.userSnapshot?.role === 'user') {
    return conversation.userSnapshot?.name?.trim() || 'User';
  }
  return 'Zeni Admin';
}

/** Admin inbox/thread: show the user's actual name for user threads, or "Zeni Agent" for system agent threads. */
export function getAdminOtherPartyLabel(conversation: Conversation): string {
  if (conversation.userSnapshot?.role === 'user') {
    return conversation.userSnapshot?.name?.trim() || 'User';
  }
  return 'Zeni Agent';
}

/** Key to dedupe conversations for agent: one row per other party (user or admin). */
export function getAgentOtherPartyKey(conversation: Conversation): string {
  if (conversation.userSnapshot?.role === 'admin') return 'zeni-admin';
  if (conversation.userSnapshot?.role === 'user') return conversation.userId || conversation.id;
  return 'zeni-admin';
}

/** Key to dedupe conversations for admin: one row per other party (user or agent). */
export function getAdminOtherPartyKey(conversation: Conversation): string {
  if (conversation.userSnapshot?.role === 'user') return conversation.userId || conversation.id;
  return 'zeni-agent';
}
