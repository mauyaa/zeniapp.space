import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import {
  fetchUsers,
  updateUserStatus,
  deleteUserAccount,
  fetchPayAccounts,
  setPayAccountStatus,
} from '../../lib/api';
import type { AdminUser, PayAccount } from '../../types/api';
import { getSocket } from '../../lib/socket';
import { useAuth } from '../../context/AuthProvider';
import { useAdminStepUp } from '../../context/AdminStepUpContext';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { errors } from '../../constants/messages';
import { cn } from '../../utils/cn';

type RoleFilter = 'all' | 'agent' | 'user';
type StatusFilter = 'all' | 'active' | 'suspended';

export function UsersPage() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [payAccounts, setPayAccounts] = useState<Record<string, PayAccount>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { token } = useAuth();
  const { runWithStepUp } = useAdminStepUp();
  const { push } = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([fetchUsers(), fetchPayAccounts().catch(() => [])])
      .then(([users, pay]) => {
        setRows(users);
        const map: Record<string, PayAccount> = {};
        pay.forEach((p) => {
          map[p.userId] = p;
        });
        setPayAccounts(map);
      })
      .catch((err) => {
        logger.error(
          'Failed to load users or pay accounts',
          {},
          err instanceof Error ? err : undefined
        );
        push({ title: 'Load failed', description: errors.generic, tone: 'error' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on mount only
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    const onUserCreated = (newUser: AdminUser) => {
      setRows((prev) => [newUser, ...prev]);
    };
    socket.on('user:created', onUserCreated);
    return () => {
      socket.off('user:created', onUserCreated);
    };
  }, [token]);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (roleFilter !== 'all') result = result.filter((r) => r.role === roleFilter);
    if (statusFilter !== 'all') result = result.filter((r) => r.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) => r.name?.toLowerCase().includes(q) || r._id.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, roleFilter, statusFilter, searchQuery]);

  const userCount = rows.filter((r) => r.role === 'user').length;
  const agentCount = rows.filter((r) => r.role === 'agent').length;
  const activeCount = rows.filter((r) => r.status === 'active').length;
  const suspendedCount = rows.filter((r) => r.status === 'suspended').length;

  const handleStatus = async (userId: string, status: 'active' | 'suspended') => {
    setActioning(userId);
    try {
      const updated = await runWithStepUp(() => updateUserStatus(userId, status));
      setRows((prev) => prev.map((u) => (u._id === userId ? { ...u, status: updated.status } : u)));
    } catch (err) {
      logger.error(
        'Update user status failed',
        { userId, status },
        err instanceof Error ? err : undefined
      );
      push({ title: 'Update failed', description: errors.generic, tone: 'error' });
    } finally {
      setActioning(null);
    }
  };

  const handlePayStatus = async (userId: string, status: 'active' | 'suspended') => {
    setActioning(userId);
    try {
      const updated = await runWithStepUp(() => setPayAccountStatus(userId, status));
      setPayAccounts((prev) => ({ ...prev, [userId]: updated }));
    } catch (err) {
      logger.error(
        'Update pay account status failed',
        { userId, status },
        err instanceof Error ? err : undefined
      );
      push({ title: 'Update failed', description: errors.generic, tone: 'error' });
    } finally {
      setActioning(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    setActioning(userId);
    try {
      await runWithStepUp(() => deleteUserAccount(userId));
      setRows((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      logger.error('Delete user failed', { userId }, err instanceof Error ? err : undefined);
      push({ title: 'Delete failed', description: errors.generic, tone: 'error' });
    } finally {
      setActioning(null);
    }
  };

  const renderUserRow = (r: AdminUser) => (
    <tr key={r._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-gray-200 text-gray-600 text-[10px] font-bold uppercase flex-shrink-0">
            {(r.name || '?').charAt(0)}
          </div>
          <div className="min-w-0">
            <span className="font-medium text-black block truncate">{r.name}</span>
            <span className="text-[10px] text-gray-500 font-mono">{r._id.slice(-8)}</span>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <span
          className={cn(
            'inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border',
            r.role === 'agent'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          )}
        >
          {r.role}
        </span>
      </td>
      <td className="py-3 px-4">
        <span
          className={cn(
            'inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border',
            r.status === 'active'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          )}
        >
          {r.status}
        </span>
      </td>
      {r.role === 'agent' && (
        <td className="py-3 px-4">
          <span
            className={cn(
              'inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border',
              r.agentVerification === 'verified'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            )}
          >
            {r.agentVerification}
          </span>
        </td>
      )}
      <td className="py-3 px-4">
        <span
          className={cn(
            'inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase border',
            (payAccounts[r._id]?.status || 'active') === 'active'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          )}
        >
          {payAccounts[r._id]?.status || 'active'}
        </span>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex flex-wrap justify-end gap-1.5" role="group" aria-label="Row actions">
          {r.status === 'active' ? (
            <Button
              size="sm"
              variant="outline"
              loading={actioning === r._id}
              onClick={() => handleStatus(r._id, 'suspended')}
            >
              Suspend
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              loading={actioning === r._id}
              onClick={() => handleStatus(r._id, 'active')}
            >
              Reactivate
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            loading={actioning === r._id}
            onClick={() =>
              handlePayStatus(
                r._id,
                (payAccounts[r._id]?.status || 'active') === 'active' ? 'suspended' : 'active'
              )
            }
          >
            {(payAccounts[r._id]?.status || 'active') === 'active' ? 'Suspend Pay' : 'Enable Pay'}
          </Button>
          <Button
            size="sm"
            variant="danger"
            loading={actioning === r._id}
            onClick={() => handleDelete(r._id)}
            aria-label={`Delete ${r.name}`}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-black mb-2">User Base</h1>
          <p className="text-sm text-gray-500">
            Manage buyers and agents with controlled status and payout access.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full pl-9 pr-3 py-2 rounded-sm border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-gray-50 border border-gray-200 rounded-sm">
          {(['all', 'agent', 'user'] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(role)}
              className={cn(
                'px-3 py-1.5 rounded-sm text-xs font-semibold capitalize transition-all',
                roleFilter === role
                  ? 'bg-white text-black border border-gray-200 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 border border-transparent'
              )}
            >
              {role === 'all' ? 'All roles' : `${role}s`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-1 bg-gray-50 border border-gray-200 rounded-sm">
          {(['all', 'active', 'suspended'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-3 py-1.5 rounded-sm text-xs font-semibold capitalize transition-all',
                statusFilter === status
                  ? 'bg-white text-black border border-gray-200 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 border border-transparent'
              )}
            >
              {status === 'all' ? 'All status' : status}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500 ml-auto">
          Showing {filteredRows.length} of {rows.length} · Users: {userCount} · Agents: {agentCount}{' '}
          · Active: {activeCount} · Suspended: {suspendedCount}
        </span>
      </div>

      {loading ? (
        <div className="rounded-sm border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={`user-skeleton-${idx}`}
                className="flex items-center justify-between border-b border-gray-100 py-4 px-6"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-sm bg-gray-200 animate-pulse" />
                  <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
                </div>
                <div className="h-5 w-16 rounded bg-gray-200 animate-pulse" />
                <div className="h-5 w-16 rounded bg-gray-200 animate-pulse" />
                <div className="h-5 w-24 rounded bg-gray-200 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12">
          <EmptyState
            variant="light"
            title={searchQuery ? 'No matching users' : 'No users found'}
            subtitle={
              searchQuery
                ? 'Try adjusting your search or filters.'
                : 'New users will appear here as they sign up.'
            }
            action={
              searchQuery
                ? {
                    label: 'Clear search',
                    onClick: () => {
                      setSearchQuery('');
                      setRoleFilter('all');
                      setStatusFilter('all');
                    },
                  }
                : { label: 'Refresh', onClick: load }
            }
          />
        </div>
      ) : (
        <div className="rounded-sm border border-gray-200 bg-white shadow-sm overflow-hidden overflow-x-auto">
          <div className="overflow-y-auto max-h-[70vh]">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  {filteredRows.some((r) => r.role === 'agent') && (
                    <th className="py-3 px-4 font-semibold">Verification</th>
                  )}
                  <th className="py-3 px-4 font-semibold">Pay</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>{filteredRows.map((r) => renderUserRow(r))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
