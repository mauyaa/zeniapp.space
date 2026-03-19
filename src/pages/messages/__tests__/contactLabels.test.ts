import { describe, it, expect } from 'vitest';
import {
  formatKnownContactLabel,
  resolveUserContactLabel,
  getUserConversationKey,
  getAgentOtherPartyLabel,
  getAdminOtherPartyLabel,
  getAgentOtherPartyKey,
  getAdminOtherPartyKey,
  shouldIncludeConversationForRole,
} from '../contactLabels';
import type { Conversation } from '../../../types/chat';

const baseConversation: Conversation = {
  id: 'conv-1',
  listingId: '',
  agentId: 'agent-1',
  userId: 'user-1',
  status: 'active',
  leadStage: 'new',
  lastMessageAt: '2026-03-19T10:00:00.000Z',
  unreadCount: 0,
  listingSnapshot: null,
  agentSnapshot: { id: 'agent-1', name: 'Agent Alice' },
  userSnapshot: { id: 'user-1', name: 'Buyer One', role: 'user' },
};

describe('formatKnownContactLabel', () => {
  it('returns Zeni Admin for support/admin labels', () => {
    expect(formatKnownContactLabel('Zeni Support')).toBe('Zeni Admin');
    expect(formatKnownContactLabel('Zeni Admin')).toBe('Zeni Admin');
    expect(formatKnownContactLabel('ZEI Admin')).toBe('Zeni Admin');
    expect(formatKnownContactLabel('support')).toBe('Zeni Admin');
    expect(formatKnownContactLabel('admin')).toBe('Zeni Admin');
    expect(formatKnownContactLabel('Customer Support')).toBe('Zeni Admin');
  });

  it('returns Zeni Agent for system agent labels only', () => {
    expect(formatKnownContactLabel('Zeni Agent')).toBe('Zeni Agent');
    expect(formatKnownContactLabel('Demo Agent')).toBe('Zeni Agent');
  });

  it('preserves real agent names and falls back to Agent when missing', () => {
    expect(formatKnownContactLabel('Alice Kamau')).toBe('Alice Kamau');
    expect(formatKnownContactLabel('Agent')).toBe('Agent');
    expect(formatKnownContactLabel('Agent Alice')).toBe('Agent Alice');
    expect(formatKnownContactLabel('Admin Jane')).toBe('Admin Jane');
    expect(formatKnownContactLabel('Support Team East')).toBe('Support Team East');
    expect(formatKnownContactLabel('')).toBe('Agent');
    expect(formatKnownContactLabel(null)).toBe('Agent');
    expect(formatKnownContactLabel(undefined)).toBe('Agent');
  });

  it('handles case insensitively', () => {
    expect(formatKnownContactLabel('ZENI SUPPORT')).toBe('Zeni Admin');
    expect(formatKnownContactLabel('zeni agent')).toBe('Zeni Agent');
  });
});

describe('resolveUserContactLabel', () => {
  it('returns Zeni Admin for support/admin labels', () => {
    expect(resolveUserContactLabel('Zeni Support')).toBe('Zeni Admin');
    expect(resolveUserContactLabel('Zeni Admin')).toBe('Zeni Admin');
    expect(resolveUserContactLabel('support')).toBe('Zeni Admin');
    expect(resolveUserContactLabel('admin')).toBe('Zeni Admin');
  });

  it('preserves real agent names for listing conversations', () => {
    expect(resolveUserContactLabel('Zeni Agent')).toBe('Zeni Agent');
    expect(resolveUserContactLabel('Agent')).toBe('Zeni Agent');
    expect(resolveUserContactLabel('Agent Alice')).toBe('Agent Alice');
    expect(resolveUserContactLabel('John')).toBe('John');
  });

  it('handles null and undefined', () => {
    expect(resolveUserContactLabel(null)).toBe('Agent');
    expect(resolveUserContactLabel(undefined)).toBe('Agent');
  });
});

describe('getUserConversationKey', () => {
  it('dedupes non-listing threads by agent id', () => {
    expect(getUserConversationKey(baseConversation)).toBe('agent:agent-1');
  });

  it('collapses system welcome threads to one canonical key', () => {
    const first = getUserConversationKey({
      ...baseConversation,
      agentId: 'support-1',
      agentSnapshot: { id: 'support-1', name: 'Zeni Support' },
    });
    const second = getUserConversationKey({
      ...baseConversation,
      id: 'conv-2',
      agentId: 'admin-1',
      agentSnapshot: { id: 'admin-1', name: 'Zeni Admin' },
    });
    const third = getUserConversationKey({
      ...baseConversation,
      id: 'conv-3',
      agentId: 'system-agent-1',
      agentSnapshot: { id: 'system-agent-1', name: 'Zeni Agent' },
      listingId: 'listing-1',
      listingSnapshot: {
        title: 'One',
        price: 'KES 1',
        locationText: 'Westlands',
        thumbUrl: 'one.jpg',
      },
    });
    const fourth = getUserConversationKey({
      ...baseConversation,
      id: 'conv-4',
      agentId: 'system-agent-2',
      agentSnapshot: { id: 'system-agent-2', name: 'Zeni Agent' },
    });
    const fifth = getUserConversationKey({
      ...baseConversation,
      id: 'conv-5',
      agentId: 'system-agent-3',
      agentSnapshot: { id: 'system-agent-3', name: 'Agent' },
    });

    expect(first).toBe('system:zeni-admin');
    expect(second).toBe('system:zeni-admin');
    expect(third).toBe('system:zeni-agent');
    expect(fourth).toBe('system:zeni-agent');
    expect(fifth).toBe('system:zeni-agent');
  });

  it('keeps different agents distinct even when names are similar', () => {
    const first = getUserConversationKey(baseConversation);
    const second = getUserConversationKey({
      ...baseConversation,
      id: 'conv-2',
      agentId: 'agent-2',
      agentSnapshot: { id: 'agent-2', name: 'Agent Alice' },
    });
    expect(first).not.toBe(second);
  });

  it('collapses listing conversations for the same agent into one inbox row', () => {
    const first = getUserConversationKey({
      ...baseConversation,
      listingId: 'listing-1',
      listingSnapshot: {
        title: 'One',
        price: 'KES 1',
        locationText: 'Westlands',
        thumbUrl: 'one.jpg',
      },
    });
    const second = getUserConversationKey({
      ...baseConversation,
      id: 'conv-3',
      listingId: 'listing-2',
      listingSnapshot: {
        title: 'Two',
        price: 'KES 2',
        locationText: 'Karen',
        thumbUrl: 'two.jpg',
      },
    });
    expect(first).toBe(second);
  });
});

describe('staff conversation labels', () => {
  it('preserves actual agent names for admin inbox rows', () => {
    expect(
      getAdminOtherPartyLabel({
        ...baseConversation,
        userSnapshot: { id: 'admin-1', name: 'Operations Admin', role: 'admin' },
      })
    ).toBe('Agent Alice');
  });

  it('uses the real admin name for agent inbox rows', () => {
    expect(
      getAgentOtherPartyLabel({
        ...baseConversation,
        userSnapshot: { id: 'admin-1', name: 'Grace Njeri', role: 'admin' },
      })
    ).toBe('Grace Njeri');
  });

  it('dedupes admin threads by actual agent id', () => {
    const first = getAdminOtherPartyKey({
      ...baseConversation,
      userSnapshot: { id: 'admin-1', name: 'Admin One', role: 'admin' },
    });
    const second = getAdminOtherPartyKey({
      ...baseConversation,
      id: 'conv-2',
      agentId: 'agent-2',
      agentSnapshot: { id: 'agent-2', name: 'Agent Brian' },
      userSnapshot: { id: 'admin-1', name: 'Admin One', role: 'admin' },
    });
    expect(first).not.toBe(second);
  });

  it('dedupes agent threads by actual counterparty id', () => {
    const first = getAgentOtherPartyKey({
      ...baseConversation,
      userSnapshot: { id: 'admin-1', name: 'Admin One', role: 'admin' },
    });
    const second = getAgentOtherPartyKey({
      ...baseConversation,
      id: 'conv-2',
      userId: 'admin-2',
      userSnapshot: { id: 'admin-2', name: 'Admin Two', role: 'admin' },
    });
    expect(first).not.toBe(second);
  });

  it('collapses the real Zeni Admin account with the internal Zeni Admin thread for agents', () => {
    const systemThread = getAgentOtherPartyKey({
      ...baseConversation,
      userId: 'agent-1',
      userSnapshot: { id: 'agent-1', name: 'Agent One', role: 'agent' },
      agentId: 'system-admin-1',
      agentSnapshot: { id: 'system-admin-1', name: 'Zeni Admin' },
    });
    const seededAdminThread = getAgentOtherPartyKey({
      ...baseConversation,
      userId: 'admin-1',
      userSnapshot: { id: 'admin-1', name: 'Zeni Admin', role: 'admin' },
    });

    expect(systemThread).toBe('system:zeni-admin');
    expect(seededAdminThread).toBe('system:zeni-admin');
  });
});

describe('shouldIncludeConversationForRole', () => {
  it('keeps both Zeni welcome threads for users', () => {
    expect(
      shouldIncludeConversationForRole('user', {
        ...baseConversation,
        agentSnapshot: { id: 'system-agent-1', name: 'Zeni Agent' },
      }, 'user-1')
    ).toBe(true);
    expect(
      shouldIncludeConversationForRole('user', {
        ...baseConversation,
        agentSnapshot: { id: 'system-admin-1', name: 'Zeni Admin' },
      }, 'user-1')
    ).toBe(true);
  });

  it('hides the legacy self Zeni Agent thread for agents', () => {
    expect(
      shouldIncludeConversationForRole(
        'agent',
        {
          ...baseConversation,
          userId: 'agent-1',
          userSnapshot: { id: 'agent-1', name: 'Agent One', role: 'agent' },
          agentId: 'system-agent-1',
          agentSnapshot: { id: 'system-agent-1', name: 'Zeni Agent' },
        },
        'agent-1'
      )
    ).toBe(false);
  });

  it('keeps the internal Zeni Admin thread for agents', () => {
    expect(
      shouldIncludeConversationForRole(
        'agent',
        {
          ...baseConversation,
          userId: 'agent-1',
          userSnapshot: { id: 'agent-1', name: 'Agent One', role: 'agent' },
          agentId: 'system-admin-1',
          agentSnapshot: { id: 'system-admin-1', name: 'Zeni Admin' },
        },
        'agent-1'
      )
    ).toBe(true);
  });

  it('hides the self Zeni Admin thread for admins', () => {
    expect(
      shouldIncludeConversationForRole(
        'admin',
        {
          ...baseConversation,
          userId: 'admin-1',
          userSnapshot: { id: 'admin-1', name: 'Admin One', role: 'admin' },
          agentId: 'system-admin-1',
          agentSnapshot: { id: 'system-admin-1', name: 'Zeni Admin' },
        },
        'admin-1'
      )
    ).toBe(false);
  });

  it('hides non-admin conversations from the admin inbox', () => {
    expect(
      shouldIncludeConversationForRole(
        'admin',
        {
          ...baseConversation,
          userId: 'user-1',
          userSnapshot: { id: 'user-1', name: 'Buyer One', role: 'user' },
          agentId: 'agent-1',
          agentSnapshot: { id: 'agent-1', name: 'Agent Alice' },
        },
        'admin-1'
      )
    ).toBe(false);
  });

  it('shows user support conversations in the admin inbox', () => {
    expect(
      shouldIncludeConversationForRole(
        'admin',
        {
          ...baseConversation,
          userId: 'user-1',
          userSnapshot: { id: 'user-1', name: 'Buyer One', role: 'user' },
          agentId: 'system-admin-1',
          agentSnapshot: { id: 'system-admin-1', name: 'Zeni Admin' },
        },
        'admin-1'
      )
    ).toBe(true);
  });
});
