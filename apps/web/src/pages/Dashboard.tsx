import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, StateMessage } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Role } from '../types/api';

export function Dashboard() {
  const { user } = useAuth();
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => api<{ status: string }>('/health'),
  });

  const rolePanels: Record<
    Role,
    { title: string; subtitle: string; actions: { label: string; to: string }[]; tips: string[] }
  > = {
    FARMER: {
      title: 'Farmer Operations',
      subtitle: 'Harvest batch registration, farm land verifications, and produce dispatch.',
      actions: [
        { label: 'View Produce Batches', to: '/app/batches' },
        { label: 'Verify Public QR', to: '/verify/AT-DEMO-0001' },
      ],
      tips: [
        'All harvest batches are registered in integer grams to guarantee exact mass conservation.',
        'Attach harvest slips and organic certificates before dispatching to distributors.',
      ],
    },
    DISTRIBUTOR: {
      title: 'Distribution Logistics',
      subtitle: 'Inbound harvest receipts, custody handoffs, and wholesale dispatches.',
      actions: [
        { label: 'Track In-Transit Batches', to: '/app/batches' },
        { label: 'Public QR Check', to: '/verify/AT-DEMO-0001' },
      ],
      tips: [
        'Confirm measured weight upon receiving produce to record any transit discrepancy.',
        'Transfers enforce two-party cryptographic acknowledgement before custody shifts.',
      ],
    },
    WHOLESALER: {
      title: 'Wholesale Depot',
      subtitle: 'Bulk inventory management, batch splitting, and retail distribution.',
      actions: [
        { label: 'Inventory Batches', to: '/app/batches' },
        { label: 'Verify Produce Lineage', to: '/verify/AT-DEMO-0001' },
      ],
      tips: [
        'Splitting batches preserves upstream parent references for bidirectional traceability.',
        'Ensure wholesale price records are logged for farmer share transparency.',
      ],
    },
    PROCESSOR: {
      title: 'Processing & Packaging',
      subtitle: 'Batch transformation, ingredient mixing, and documented yield loss tracking.',
      actions: [
        { label: 'Production Batches', to: '/app/batches' },
        { label: 'Product Verification', to: '/verify/AT-DEMO-0001' },
      ],
      tips: [
        'Mass balance invariant: Input Grams = Output Grams + Documented Processing Loss.',
        'Upload facility inspection records and laboratory test reports.',
      ],
    },
    RETAILER: {
      title: 'Retail Storefront',
      subtitle: 'Stock verification, consumer QR labels, and produce freshness monitoring.',
      actions: [
        { label: 'Store Produce Stock', to: '/app/batches' },
        { label: 'Test Customer QR Code', to: '/verify/AT-DEMO-0001' },
      ],
      tips: [
        'Display QR codes on shelves so shoppers can verify origin and farm-gate pricing.',
        'Immediate alert notifications are dispatched if an active recall touches store stock.',
      ],
    },
    AUDITOR: {
      title: 'Regulatory & Audit Oversight',
      subtitle: 'Compliance inspections, food-safety recalls, and tamper-evident audit logs.',
      actions: [
        { label: 'Audit Batches & Lineage', to: '/app/batches' },
        { label: 'Inspect Demo Trace', to: '/verify/AT-DEMO-0001' },
      ],
      tips: [
        'Bidirectional trace can traverse upstream to origin farms or downstream to consumers.',
        'The database audit log is enforced append-only via database-level triggers.',
      ],
    },
    ADMIN: {
      title: 'Platform Administration',
      subtitle: 'User access control, account approvals, and node health telemetry.',
      actions: [
        { label: 'User Administration', to: '/app/admin/users' },
        { label: 'Inspect All Batches', to: '/app/batches' },
      ],
      tips: [
        'Review and approve pending accounts before granting access to supply-chain operations.',
        'Suspend accounts immediately in the event of compromised credentials or fraud.',
      ],
    },
    CONSUMER: {
      title: 'Consumer Traceability',
      subtitle: 'Origin authenticity, chemical testing disclosures, and farmer-share transparency.',
      actions: [
        { label: 'Verify Produce by QR', to: '/verify/AT-DEMO-0001' },
        { label: 'Browse Public Batches', to: '/app/batches' },
      ],
      tips: [
        'Scan QR codes to inspect the complete farm-to-shelf journey of your produce.',
        'Check verified certifications and confirm fair compensation was paid to the farmer.',
      ],
    },
  };

  const currentRole = user?.role ?? 'CONSUMER';
  const panel = rolePanels[currentRole];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">
            Welcome, {user?.name ?? 'Guest'}
          </h1>
          <p className="text-sm text-stone-600">
            {panel.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user && <Badge tone="green">{user.role}</Badge>}
          {user && (
            <Badge tone={user.status === 'ACTIVE' ? 'green' : 'amber'}>
              {user.status}
            </Badge>
          )}
        </div>
      </div>

      {/* Role-Specific Overview Card */}
      <Card>
        <h2 className="text-lg font-medium text-stone-900">{panel.title}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {panel.actions.map((act) => (
            <Link key={act.to} to={act.to}>
              <Button className="px-3 py-1.5 text-xs">{act.label}</Button>
            </Link>
          ))}
        </div>

        <div className="mt-6 border-t border-soil-100 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Operating Guidelines
          </h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-stone-600">
            {panel.tips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>
      </Card>

      {/* API Telemetry & Health */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-900">Backend API Connectivity</span>
            <span className="text-xs text-stone-400">(/api/v1/health)</span>
          </div>
          {health.isPending ? (
            <Badge>Checking…</Badge>
          ) : health.isError ? (
            <Badge tone="red">Unreachable</Badge>
          ) : (
            <Badge tone="green">Connected</Badge>
          )}
        </div>
        {health.isError && (
          <p className="mt-2 text-sm text-stone-600">{health.error.message}</p>
        )}
      </Card>

      <StateMessage kind="empty" title="Real-time Supply Chain Stream">
        Active batch operations, transfer dispatches, and regulatory updates will populate this
        feed as operations take place.
      </StateMessage>
    </div>
  );
}
