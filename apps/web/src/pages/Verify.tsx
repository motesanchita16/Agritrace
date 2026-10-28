import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Badge, Card, StateMessage } from '../components/ui';
import { api, ApiError } from '../lib/api';
import type { PublicVerification } from '../types/api';

const labels = {
  VERIFIED: ['Verified record', 'green'],
  PENDING: ['Pending verification', 'amber'],
  INCOMPLETE: ['Incomplete history', 'amber'],
  MISMATCH: ['Evidence mismatch', 'red'],
  RECALL: ['Recall alert', 'red'],
} as const;

export function Verify() {
  const { publicBatchId = '' } = useParams();
  const q = useQuery({
    queryKey: ['verify', publicBatchId],
    queryFn: () => api<PublicVerification>(`/public/verify/${encodeURIComponent(publicBatchId)}`),
  });
  if (q.isPending) return <StateMessage kind="loading" title="Checking batch…" />;
  if (q.isError) {
    const unknown = q.error instanceof ApiError && q.error.status === 404;
    return (
      <StateMessage kind="error" title={unknown ? 'Unknown batch' : 'Verification unavailable'}>
        {unknown ? 'No record matches this code. A copied or mistyped QR code can look genuine, so treat it with caution.' : q.error.message}
      </StateMessage>
    );
  }
  const v = q.data;
  const [label, tone] = labels[v.status];
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">{v.crop}</h1>
          <Badge tone={tone}>{label}</Badge>
        </div>
        <p className="mt-1 text-sm text-stone-600">Batch {v.publicBatchId} · harvested {v.harvestDate}{v.region ? ` · ${v.region}` : ''}</p>
        {v.recallNotice && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{v.recallNotice}</p>}
      </Card>
      <p className="text-xs text-stone-500">
        This page shows what was recorded. It does not prove the physical produce in your hand matches the record, and QR codes can be copied.
      </p>
    </div>
  );
}
