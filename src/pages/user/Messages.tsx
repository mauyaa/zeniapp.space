import React from 'react';
import { EmptyState } from '../../components/ui/EmptyState';

export function MessagesPage() {
  return (
    <div className="space-y-4">
      <div className="text-xl font-bold text-slate-100">Messages</div>
      <EmptyState title="No conversations" subtitle="Start a chat from a listing detail page." />
    </div>
  );
}
