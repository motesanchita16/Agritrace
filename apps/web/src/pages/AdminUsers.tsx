import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Spinner, StateMessage } from '../components/ui';
import { api } from '../lib/api';
import type { AccountStatus, AuthUser, Role } from '../types/api';

export function AdminUsers() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const queryParams = new URLSearchParams();
  if (roleFilter) queryParams.set('role', roleFilter);
  if (statusFilter) queryParams.set('status', statusFilter);

  const { data, isLoading, error } = useQuery<{ data: AuthUser[] }>({
    queryKey: ['admin-users', roleFilter, statusFilter],
    queryFn: () =>
      api<{ data: AuthUser[] }>(`/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`),
  });

  const updateStatus = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: AccountStatus }) =>
      api(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const users = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">User Administration</h1>
          <p className="text-sm text-stone-600">
            Manage user roles, verify account approvals, and configure account access.
          </p>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-stone-700">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-leaf-600 focus:outline-none"
            >
              <option value="">All Roles</option>
              <option value="FARMER">Farmer</option>
              <option value="DISTRIBUTOR">Distributor</option>
              <option value="WHOLESALER">Wholesaler</option>
              <option value="PROCESSOR">Processor</option>
              <option value="RETAILER">Retailer</option>
              <option value="AUDITOR">Auditor</option>
              <option value="ADMIN">Administrator</option>
              <option value="CONSUMER">Public Consumer</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-stone-700">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-leaf-600 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Spinner />
        </div>
      ) : error ? (
        <StateMessage kind="error" title="Failed to load users">
          {error.message}
        </StateMessage>
      ) : users.length === 0 ? (
        <StateMessage kind="empty" title="No users found">
          No user accounts matched the selected filters.
        </StateMessage>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-soil-100 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
            <thead className="bg-stone-50 font-medium text-stone-700">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium text-stone-900">{u.name}</td>
                  <td className="px-4 py-3 text-stone-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        u.status === 'ACTIVE'
                          ? 'green'
                          : u.status === 'PENDING'
                            ? 'amber'
                            : 'red'
                      }
                    >
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {u.status === 'PENDING' && (
                        <Button
                          className="px-2.5 py-1 text-xs"
                          onClick={() => updateStatus.mutate({ userId: u.id, status: 'ACTIVE' })}
                        >
                          Approve
                        </Button>
                      )}
                      {u.status === 'ACTIVE' && u.role !== 'ADMIN' && (
                        <Button
                          className="px-2.5 py-1 text-xs"
                          variant="secondary"
                          onClick={() => updateStatus.mutate({ userId: u.id, status: 'SUSPENDED' })}
                        >
                          Suspend
                        </Button>
                      )}
                      {u.status === 'SUSPENDED' && (
                        <Button
                          className="px-2.5 py-1 text-xs"
                          variant="secondary"
                          onClick={() => updateStatus.mutate({ userId: u.id, status: 'ACTIVE' })}
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
