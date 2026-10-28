import 'dotenv/config';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient, type Role } from '@prisma/client';
import { verifyConsistency } from './verify';

// FICTIONAL DEMONSTRATION DATA ONLY. All names, issuers and documents are invented.
const prisma = new PrismaClient();
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'Demo-Only-Password-1!';
const TABLES = [
  'RefreshToken',
  'AuditLog',
  'Notification',
  'RecallAlert',
  'RecallAffectedBatch',
  'RecallCase',
  'FarmerShareRecord',
  'PriceRecord',
  'Certification',
  'Evidence',
  'ReceiptConfirmation',
  'BatchTransfer',
  'BatchLineage',
  'Batch',
  'BatchOperation',
  'Farm',
  'User',
];

async function guard() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed: NODE_ENV=production');
  const host = new URL(process.env.DATABASE_URL ?? '').hostname;
  if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(host)) throw new Error(`Refusing to seed non-local host "${host}"`);
  if ((await prisma.user.count()) > 0) {
    if (process.env.SEED_RESET !== 'true') {
      throw new Error('Database already contains users. Nothing changed. To wipe LOCAL data and reseed, run: npm run db:reset-demo');
    }
    console.warn('SEED_RESET=true: truncating all AgriTrace tables on local database...');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
  }
}

async function main() {
  await guard();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const mk = (name: string, email: string, role: Role) =>
    prisma.user.create({ data: { name: `${name} (DEMO)`, email, role, passwordHash, status: 'ACTIVE' } });

  const farmer = await mk('Asha Patil', 'farmer@demo.agritrace.test', 'FARMER');
  const distributor = await mk('Ravi Distributors', 'distributor@demo.agritrace.test', 'DISTRIBUTOR');
  const wholesaler = await mk('Meera Wholesale', 'wholesaler@demo.agritrace.test', 'WHOLESALER');
  const processor = await mk('Fresh Pack Processing', 'processor@demo.agritrace.test', 'PROCESSOR');
  const retailer1 = await mk('Town Mart', 'retailer1@demo.agritrace.test', 'RETAILER');
  await mk('City Grocer', 'retailer2@demo.agritrace.test', 'RETAILER');
  const auditor = await mk('Demo Food Regulator', 'auditor@demo.agritrace.test', 'AUDITOR');
  const admin = await mk('Demo Admin', 'admin@demo.agritrace.test', 'ADMIN');
  const consumer = await mk('Priya Consumer', 'consumer@demo.agritrace.test', 'CONSUMER');

  // Edge cases for account status testing
  await prisma.user.create({
    data: {
      name: 'Pending Applicant (DEMO)',
      email: 'pending@demo.agritrace.test',
      role: 'FARMER',
      passwordHash,
      status: 'PENDING',
    },
  });
  await prisma.user.create({
    data: {
      name: 'Suspended Member (DEMO)',
      email: 'suspended@demo.agritrace.test',
      role: 'DISTRIBUTOR',
      passwordHash,
      status: 'SUSPENDED',
    },
  });

  const farm1 = await prisma.farm.create({ data: { ownerId: farmer.id, name: 'Green Valley Farm (fictional)', region: 'Demo District A', verificationStatus: 'VERIFIED' } });
  const farm2 = await prisma.farm.create({ data: { ownerId: farmer.id, name: 'Riverbend Plot (fictional)', region: 'Demo District B' } });

  const op = (type: 'REGISTER' | 'SPLIT' | 'MERGE', actorId: string, input: number, output: number, loss: number, key: string, extra: { lossReason?: string } = {}) =>
    prisma.batchOperation.create({ data: { type, actorId, inputGrams: input, outputGrams: output, lossGrams: loss, idempotencyKey: `seed-${key}`, ...extra } });
  const batch = (n: number, farmId: string, creatorId: string, holderId: string, grams: number, opId: string, status: 'ACTIVE' | 'CONSUMED' | 'IN_TRANSIT', harvest: string) =>
    prisma.batch.create({ data: { publicId: `AT-DEMO-${String(n).padStart(4, '0')}`, cropType: 'Tomato', originFarmId: farmId, creatorId, currentHolderId: holderId, originOperationId: opId, initialQuantityGrams: grams, currentQuantityGrams: grams, harvestDate: new Date(harvest), status, idempotencyKey: `seed-batch-${n}` } });
  const link = (operationId: string, parentBatchId: string, childBatchId: string, contributedGrams: number) =>
    prisma.batchLineage.create({ data: { operationId, parentBatchId, childBatchId, contributedGrams } });
  const transfer = async (n: string, batchId: string, from: string, to: string, grams: number, status: 'ACCEPTED' | 'DISPATCHED') => {
    const t = await prisma.batchTransfer.create({ data: { batchId, senderId: from, recipientId: to, declaredGrams: grams, measuredGrams: status === 'ACCEPTED' ? grams : null, status, dispatchedAt: new Date('2026-09-02'), receivedAt: status === 'ACCEPTED' ? new Date('2026-09-03') : null, idempotencyKey: `seed-transfer-${n}` } });
    if (status === 'ACCEPTED') await prisma.receiptConfirmation.create({ data: { transferId: t.id, confirmedById: to, outcome: 'ACCEPTED', measuredGrams: grams, discrepancyGrams: 0 } });
    return t;
  };

  // B1: 1,000 kg registered by farmer; B6: 300 kg second harvest. (grams)
  const reg1 = await op('REGISTER', farmer.id, 0, 1_000_000, 0, 'reg-1');
  const b1 = await batch(1, farm1.id, farmer.id, distributor.id, 1_000_000, reg1.id, 'CONSUMED', '2026-08-30');
  const reg6 = await op('REGISTER', farmer.id, 0, 300_000, 0, 'reg-6');
  const b6 = await batch(6, farm2.id, farmer.id, distributor.id, 300_000, reg6.id, 'CONSUMED', '2026-08-31');
  await transfer('b1', b1.id, farmer.id, distributor.id, 1_000_000, 'ACCEPTED');
  await transfer('b6', b6.id, farmer.id, distributor.id, 300_000, 'ACCEPTED');

  // Distributor splits B1: 1,000,000 = 600,000 + 380,000 + 20,000 loss.
  const split1 = await op('SPLIT', distributor.id, 1_000_000, 980_000, 20_000, 'split-1', { lossReason: 'Sorting rejects (demo)' });
  const b2 = await batch(2, farm1.id, distributor.id, wholesaler.id, 600_000, split1.id, 'CONSUMED', '2026-08-30');
  const b3 = await batch(3, farm1.id, distributor.id, distributor.id, 380_000, split1.id, 'CONSUMED', '2026-08-30');
  await link(split1.id, b1.id, b2.id, 600_000);
  await link(split1.id, b1.id, b3.id, 380_000);
  await transfer('b2', b2.id, distributor.id, wholesaler.id, 600_000, 'ACCEPTED');

  // Wholesaler splits B2: 600,000 = 400,000 + 195,000 + 5,000 loss.
  const split2 = await op('SPLIT', wholesaler.id, 600_000, 595_000, 5_000, 'split-2', { lossReason: 'Handling damage (demo)' });
  const b4 = await batch(4, farm1.id, wholesaler.id, retailer1.id, 400_000, split2.id, 'ACTIVE', '2026-08-30');
  const b5 = await batch(5, farm1.id, wholesaler.id, wholesaler.id, 195_000, split2.id, 'IN_TRANSIT', '2026-08-30');
  await link(split2.id, b2.id, b4.id, 400_000);
  await link(split2.id, b2.id, b5.id, 195_000);
  await transfer('b4', b4.id, wholesaler.id, retailer1.id, 400_000, 'ACCEPTED');
  await transfer('b5', b5.id, wholesaler.id, processor.id, 195_000, 'DISPATCHED');

  // Distributor merges B3 (380,000) + B6 (300,000) -> B7 680,000, no loss.
  const merge1 = await op('MERGE', distributor.id, 680_000, 680_000, 0, 'merge-1');
  const b7 = await batch(7, farm1.id, distributor.id, distributor.id, 680_000, merge1.id, 'ACTIVE', '2026-08-31');
  await link(merge1.id, b3.id, b7.id, 380_000);
  await link(merge1.id, b6.id, b7.id, 300_000);

  // Evidence: synthetic, clearly fictional content; hash is of that text.
  const slipText = 'FICTIONAL DEMO weighing slip: AT-DEMO-0001, 1000 kg';
  const slip = await prisma.evidence.create({ data: { type: 'WEIGHING_SLIP', fileName: 'DEMO-weighing-slip.txt', mimeType: 'text/plain', sizeBytes: Buffer.byteLength(slipText), sha256: createHash('sha256').update(slipText).digest('hex'), storageType: 'LOCAL', storageRef: 'demo://no-file-stored', uploadedById: farmer.id, batchId: b1.id, operationId: reg1.id } });
  await prisma.batch.update({ where: { id: b1.id }, data: { evidenceHash: slip.sha256 } });

  // Certifications (fictional issuers). One unverified, one reviewed by the demo auditor.
  await prisma.certification.create({ data: { type: 'Organic (fictional scheme)', issuer: 'Demo Organic Council (fictional)', farmId: farm1.id, issuedAt: new Date('2026-01-10'), expiresAt: new Date('2027-01-09'), status: 'VERIFIED', reviewedById: auditor.id, reviewedAt: new Date('2026-02-01'), notes: 'Synthetic demo record' } });
  await prisma.certification.create({ data: { type: 'Good Practice (fictional scheme)', issuer: 'Demo Farm Standards (fictional)', farmId: farm2.id, issuedAt: new Date('2026-03-01'), status: 'UNVERIFIED', notes: 'Awaiting review; not officially certified' } });

  // Prices (INR, exact decimals). Farmer share is an ESTIMATE from a stated method.
  await prisma.priceRecord.create({ data: { batchId: b1.id, recordedById: farmer.id, kind: 'FARM_GATE', quantityGrams: 1_000_000, totalAmount: '45000.00', currency: 'INR' } });
  const retail = await prisma.priceRecord.create({ data: { batchId: b4.id, recordedById: retailer1.id, kind: 'RETAIL', quantityGrams: 400_000, totalAmount: '28800.00', currency: 'INR' } });
  await prisma.farmerShareRecord.create({ data: { priceRecordId: retail.id, farmerAmount: '18000.00', farmerSharePercent: '62.50', dataQuality: 'ESTIMATED', calculationMethod: 'Origin farm-gate price (45.00/kg) x 400 kg, divided by retail total; losses not allocated' } });

  // Sample recall: investigation rooted at B2, suspected downstream exposure only.
  const recall = await prisma.recallCase.create({ data: { publicRef: 'RC-DEMO-0001', rootBatchId: b2.id, initiatorId: auditor.id, reason: 'FICTIONAL DEMO: possible contamination reported (unconfirmed)', severity: 'MEDIUM', status: 'INVESTIGATING' } });
  await prisma.recallAffectedBatch.createMany({ data: [
    { recallCaseId: recall.id, batchId: b2.id, direction: 'SOURCE', exposure: 'SUSPECTED' },
    { recallCaseId: recall.id, batchId: b4.id, direction: 'DOWNSTREAM', exposure: 'SUSPECTED' },
    { recallCaseId: recall.id, batchId: b5.id, direction: 'DOWNSTREAM', exposure: 'SUSPECTED' },
  ] });
  for (const u of [wholesaler, retailer1, processor]) {
    await prisma.recallAlert.create({ data: { recallCaseId: recall.id, recipientId: u.id, message: 'Demo recall under investigation. Hold affected stock pending review.' } });
    await prisma.notification.create({ data: { userId: u.id, type: 'RECALL', title: 'Recall under investigation (demo)', body: 'See recall RC-DEMO-0001.' } });
  }

  const audit = (actorId: string, action: string, resourceType: string, resourceId: string) =>
    ({ actorId, action, resourceType, resourceId, correlationId: `seed-${resourceId.slice(0, 8)}`, metadata: { demo: true } });
  await prisma.auditLog.createMany({ data: [
    audit(farmer.id, 'BATCH_REGISTERED', 'Batch', b1.id), audit(distributor.id, 'BATCH_SPLIT', 'BatchOperation', split1.id),
    audit(wholesaler.id, 'BATCH_SPLIT', 'BatchOperation', split2.id), audit(distributor.id, 'BATCH_MERGED', 'BatchOperation', merge1.id),
    audit(auditor.id, 'RECALL_CREATED', 'RecallCase', recall.id), audit(admin.id, 'DEMO_SEED_RUN', 'System', 'seed-run-0001'),
  ] });

  const problems = await verifyConsistency(prisma);
  if (problems.length) throw new Error(`Seed consistency check FAILED:\n- ${problems.join('\n- ')}`);
  console.log('Seed complete. Consistency check passed (mass balance + lineage).');
  console.log(`Demo accounts: *@demo.agritrace.test, password from SEED_DEMO_PASSWORD (default is development-only).`);
}

main()
  .catch((e: unknown) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
