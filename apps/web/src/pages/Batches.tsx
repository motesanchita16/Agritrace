import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Badge, Card, StateMessage } from '../components/ui';
import { api, ApiError, formatKg } from '../lib/api';
import type { BatchSummary } from '../types/api';

const tone = { ACTIVE: 'green', CONSUMED: 'gray', RECALLED: 'red' } as const;

export function BatchList() {
  const q = useQuery({ queryKey: ['batches'], queryFn: () => api<BatchSummary[]>('/batches') });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Batches</h1>
      {q.isPending && <StateMessage kind="loading" title="Loading batches…" />}
      {q.isError && <StateMessage kind="error" title="Could not load batches">{q.error.message}</StateMessage>}
      {q.isSuccess && q.data.length === 0 && <StateMessage kind="empty" title="No batches registered yet" />}
      {q.isSuccess && q.data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-soil-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-soil-50 text-xs uppercase text-stone-500">
              <tr><th className="p-3">Batch</th><th className="p-3">Crop</th><th className="p-3">Quantity</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody>
              {q.data.map((b) => (
                <tr key={b.id} className="border-t border-soil-100">
                  <td className="p-3"><Link className="text-leaf-700 underline" to={`/app/batches/${b.id}`}>{b.id}</Link></td>
                  <td className="p-3">{b.crop}</td>
                  <td className="p-3">{formatKg(b.currentQuantityGrams)}</td>
                  <td className="p-3"><Badge tone={tone[b.status]}>{b.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function BatchDetail() {
  const { batchId = '' } = useParams();
  const q = useQuery({ queryKey: ['batch', batchId], queryFn: () => api<BatchSummary>(`/batches/${encodeURIComponent(batchId)}`) });
  if (q.isPending) return <StateMessage kind="loading" title="Loading batch…" />;
  if (q.isError) {
    const notFound = q.error instanceof ApiError && q.error.status === 404;
    return <StateMessage kind="error" title={notFound ? 'Batch not found' : 'Could not load batch'}>{q.error.message}</StateMessage>;
  }
  const b = q.data;
  return (
    <div className="space-y-4">
      <Link to="/app/batches" className="text-sm text-leaf-700 underline">← All batches</Link>
      <Card>
        <h1 className="text-xl font-semibold">{b.crop} · {b.id}</h1>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-stone-500">Quantity</dt><dd>{formatKg(b.currentQuantityGrams)}</dd></div>
          <div><dt className="text-stone-500">Harvest date</dt><dd>{b.harvestDate}</dd></div>
          <div><dt className="text-stone-500">Status</dt><dd><Badge tone={tone[b.status]}>{b.status}</Badge></dd></div>
        </dl>
      </Card>
    </div>
  );
}
