import { Link } from 'react-router-dom';
import { Card } from '../components/ui';

const features = [
  ['Batch lineage', 'Follow produce from farm through every split, merge and processing step.'],
  ['Mass balance', 'Every transformation must reconcile: input = outputs + documented loss.'],
  ['Evidence integrity', 'SHA-256 hashes show whether stored evidence has changed.'],
  ['Recalls', 'Trace affected descendant batches and surface public warnings.'],
];

export function Landing() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-leaf-900 px-6 py-14 text-white md:px-12">
        <h1 className="max-w-2xl text-3xl font-bold md:text-5xl">From farm to shelf, with a verifiable history.</h1>
        <p className="mt-4 max-w-xl text-leaf-100">
          AgriTrace tracks produce batches, enforces quantity conservation, and lets consumers check a batch by QR code.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/register" className="rounded-lg bg-harvest-500 px-4 py-2 font-medium text-stone-900 hover:bg-harvest-100">Create an account</Link>
          <Link to="/login" className="rounded-lg border border-white/60 px-4 py-2 font-medium hover:bg-white/10">Sign in</Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(([t, d]) => (
          <Card key={t}><h2 className="font-semibold text-leaf-700">{t}</h2><p className="mt-2 text-sm text-stone-600">{d}</p></Card>
        ))}
      </section>
    </div>
  );
}
