import type { PrismaClient } from '@prisma/client';

/** Re-checks mass-balance and lineage invariants from stored data. Integer grams only. */
export async function verifyConsistency(prisma: PrismaClient): Promise<string[]> {
  const errors: string[] = [];
  const ops = await prisma.batchOperation.findMany({
    include: { outputBatches: true, lineage: { include: { parentBatch: true } } },
  });

  for (const op of ops) {
    const id = op.id.slice(0, 8);
    const outputSum = op.outputBatches.reduce((s, b) => s + b.initialQuantityGrams, 0);
    if (outputSum !== op.outputGrams) errors.push(`op ${id}: outputGrams ${op.outputGrams} != sum of output batches ${outputSum}`);
    if (op.type === 'REGISTER') continue;

    if (op.inputGrams !== op.outputGrams + op.lossGrams)
      errors.push(`op ${id} (${op.type}): input ${op.inputGrams} != outputs ${op.outputGrams} + loss ${op.lossGrams}`);

    const parents = new Map(op.lineage.map((l) => [l.parentBatchId, l.parentBatch]));
    const parentSum = [...parents.values()].reduce((s, b) => s + b.initialQuantityGrams, 0);
    if (parentSum !== op.inputGrams) errors.push(`op ${id}: parent batches total ${parentSum} != inputGrams ${op.inputGrams}`);
    for (const p of parents.values()) {
      if (p.status !== 'CONSUMED' && p.status !== 'RECALLED') errors.push(`op ${id}: parent ${p.publicId} not consumed`);
    }
    const lineageSum = op.lineage.reduce((s, l) => s + l.contributedGrams, 0);
    if (lineageSum !== op.outputGrams) errors.push(`op ${id}: lineage contributions ${lineageSum} != outputGrams ${op.outputGrams}`);
  }

  const batches = await prisma.batch.findMany();
  for (const b of batches) {
    if (b.currentQuantityGrams < 0 || b.currentQuantityGrams > b.initialQuantityGrams)
      errors.push(`batch ${b.publicId}: current quantity out of bounds`);
  }

  const transfers = await prisma.batchTransfer.findMany({ where: { status: 'ACCEPTED' }, include: { receipt: true } });
  for (const t of transfers) {
    if (!t.receipt || t.measuredGrams === null) errors.push(`transfer ${t.id.slice(0, 8)}: accepted without receipt/measurement`);
    else if (t.receipt.discrepancyGrams !== t.declaredGrams - t.measuredGrams)
      errors.push(`transfer ${t.id.slice(0, 8)}: discrepancy mismatch`);
  }
  return errors;
}
