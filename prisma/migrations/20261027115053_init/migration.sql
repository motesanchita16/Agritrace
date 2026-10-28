-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FARMER', 'DISTRIBUTOR', 'WHOLESALER', 'PROCESSOR', 'RETAILER', 'AUDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED', 'FLAGGED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PENDING_CHAIN', 'ACTIVE', 'IN_TRANSIT', 'CONSUMED', 'RECALLED');

-- CreateEnum
CREATE TYPE "ChainStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('REGISTER', 'SPLIT', 'MERGE', 'PROCESS');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'DISPATCHED', 'ACCEPTED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReceiptOutcome" AS ENUM ('ACCEPTED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('HARVEST_RECORD', 'WEIGHING_SLIP', 'DELIVERY_RECEIPT', 'PROCESSING_RECORD', 'LAB_REPORT', 'CERTIFICATION_DOC', 'INSPECTION_RECORD', 'OTHER');

-- CreateEnum
CREATE TYPE "StorageType" AS ENUM ('LOCAL', 'IPFS');

-- CreateEnum
CREATE TYPE "RecallStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'ACTIVE_RECALL', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RecallSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TraceDirection" AS ENUM ('SOURCE', 'UPSTREAM', 'DOWNSTREAM');

-- CreateEnum
CREATE TYPE "ExposureLevel" AS ENUM ('SUSPECTED', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('SENT', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "PriceKind" AS ENUM ('FARM_GATE', 'WHOLESALE', 'RETAIL');

-- CreateEnum
CREATE TYPE "DataQuality" AS ENUM ('RECORDED', 'ESTIMATED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Farm" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "approxLatitude" DECIMAL(8,5),
    "approxLongitude" DECIMAL(8,5),
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "cropType" TEXT NOT NULL,
    "originFarmId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "currentHolderId" TEXT NOT NULL,
    "originOperationId" TEXT,
    "initialQuantityGrams" INTEGER NOT NULL,
    "currentQuantityGrams" INTEGER NOT NULL,
    "harvestDate" DATE NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "chainStatus" "ChainStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "chainTxHash" TEXT,
    "evidenceHash" TEXT,
    "idempotencyKey" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchOperation" (
    "id" TEXT NOT NULL,
    "type" "OperationType" NOT NULL,
    "actorId" TEXT NOT NULL,
    "inputGrams" INTEGER NOT NULL DEFAULT 0,
    "outputGrams" INTEGER NOT NULL,
    "lossGrams" INTEGER NOT NULL DEFAULT 0,
    "lossReason" TEXT,
    "reason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "chainStatus" "ChainStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "chainTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchLineage" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "parentBatchId" TEXT NOT NULL,
    "childBatchId" TEXT NOT NULL,
    "contributedGrams" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchLineage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchTransfer" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "declaredGrams" INTEGER NOT NULL,
    "measuredGrams" INTEGER,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "dispatchedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "disputeReason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceiptConfirmation" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "confirmedById" TEXT NOT NULL,
    "outcome" "ReceiptOutcome" NOT NULL,
    "measuredGrams" INTEGER NOT NULL,
    "discrepancyGrams" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "storageType" "StorageType" NOT NULL,
    "storageRef" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT NOT NULL,
    "batchId" TEXT,
    "operationId" TEXT,
    "transferId" TEXT,
    "recallCaseId" TEXT,
    "integrityCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "farmId" TEXT,
    "batchId" TEXT,
    "issuedAt" DATE NOT NULL,
    "expiresAt" DATE,
    "status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "evidenceId" TEXT,
    "notes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecallCase" (
    "id" TEXT NOT NULL,
    "publicRef" TEXT NOT NULL,
    "rootBatchId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "severity" "RecallSeverity" NOT NULL,
    "status" "RecallStatus" NOT NULL DEFAULT 'OPEN',
    "lineageIncomplete" BOOLEAN NOT NULL DEFAULT false,
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecallCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecallAffectedBatch" (
    "id" TEXT NOT NULL,
    "recallCaseId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "direction" "TraceDirection" NOT NULL,
    "exposure" "ExposureLevel" NOT NULL DEFAULT 'SUSPECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecallAffectedBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecallAlert" (
    "id" TEXT NOT NULL,
    "recallCaseId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "RecallAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceRecord" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "kind" "PriceKind" NOT NULL,
    "quantityGrams" INTEGER NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "dataQuality" "DataQuality" NOT NULL DEFAULT 'RECORDED',
    "evidenceId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmerShareRecord" (
    "id" TEXT NOT NULL,
    "priceRecordId" TEXT NOT NULL,
    "farmerAmount" DECIMAL(14,2),
    "farmerSharePercent" DECIMAL(5,2),
    "calculationMethod" TEXT NOT NULL,
    "dataQuality" "DataQuality" NOT NULL DEFAULT 'ESTIMATED',
    "costBreakdown" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FarmerShareRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "metadata" JSONB,
    "correlationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "Farm_region_idx" ON "Farm"("region");

-- CreateIndex
CREATE UNIQUE INDEX "Farm_ownerId_name_key" ON "Farm"("ownerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_publicId_key" ON "Batch"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_idempotencyKey_key" ON "Batch"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Batch_status_idx" ON "Batch"("status");

-- CreateIndex
CREATE INDEX "Batch_currentHolderId_status_idx" ON "Batch"("currentHolderId", "status");

-- CreateIndex
CREATE INDEX "Batch_originFarmId_idx" ON "Batch"("originFarmId");

-- CreateIndex
CREATE INDEX "Batch_cropType_idx" ON "Batch"("cropType");

-- CreateIndex
CREATE INDEX "Batch_originOperationId_idx" ON "Batch"("originOperationId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchOperation_idempotencyKey_key" ON "BatchOperation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BatchOperation_actorId_createdAt_idx" ON "BatchOperation"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "BatchOperation_type_idx" ON "BatchOperation"("type");

-- CreateIndex
CREATE INDEX "BatchLineage_parentBatchId_idx" ON "BatchLineage"("parentBatchId");

-- CreateIndex
CREATE INDEX "BatchLineage_childBatchId_idx" ON "BatchLineage"("childBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchLineage_operationId_parentBatchId_childBatchId_key" ON "BatchLineage"("operationId", "parentBatchId", "childBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchTransfer_idempotencyKey_key" ON "BatchTransfer"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BatchTransfer_batchId_idx" ON "BatchTransfer"("batchId");

-- CreateIndex
CREATE INDEX "BatchTransfer_recipientId_status_idx" ON "BatchTransfer"("recipientId", "status");

-- CreateIndex
CREATE INDEX "BatchTransfer_senderId_status_idx" ON "BatchTransfer"("senderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptConfirmation_transferId_key" ON "ReceiptConfirmation"("transferId");

-- CreateIndex
CREATE INDEX "ReceiptConfirmation_confirmedById_idx" ON "ReceiptConfirmation"("confirmedById");

-- CreateIndex
CREATE INDEX "Evidence_sha256_idx" ON "Evidence"("sha256");

-- CreateIndex
CREATE INDEX "Evidence_batchId_idx" ON "Evidence"("batchId");

-- CreateIndex
CREATE INDEX "Evidence_operationId_idx" ON "Evidence"("operationId");

-- CreateIndex
CREATE INDEX "Evidence_uploadedById_idx" ON "Evidence"("uploadedById");

-- CreateIndex
CREATE INDEX "Certification_farmId_idx" ON "Certification"("farmId");

-- CreateIndex
CREATE INDEX "Certification_batchId_idx" ON "Certification"("batchId");

-- CreateIndex
CREATE INDEX "Certification_status_idx" ON "Certification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RecallCase_publicRef_key" ON "RecallCase"("publicRef");

-- CreateIndex
CREATE INDEX "RecallCase_status_idx" ON "RecallCase"("status");

-- CreateIndex
CREATE INDEX "RecallCase_rootBatchId_idx" ON "RecallCase"("rootBatchId");

-- CreateIndex
CREATE INDEX "RecallAffectedBatch_batchId_idx" ON "RecallAffectedBatch"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "RecallAffectedBatch_recallCaseId_batchId_key" ON "RecallAffectedBatch"("recallCaseId", "batchId");

-- CreateIndex
CREATE INDEX "RecallAlert_recipientId_status_idx" ON "RecallAlert"("recipientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RecallAlert_recallCaseId_recipientId_key" ON "RecallAlert"("recallCaseId", "recipientId");

-- CreateIndex
CREATE INDEX "PriceRecord_batchId_kind_idx" ON "PriceRecord"("batchId", "kind");

-- CreateIndex
CREATE INDEX "FarmerShareRecord_priceRecordId_idx" ON "FarmerShareRecord"("priceRecordId");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_correlationId_idx" ON "AuditLog"("correlationId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_originFarmId_fkey" FOREIGN KEY ("originFarmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_currentHolderId_fkey" FOREIGN KEY ("currentHolderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_originOperationId_fkey" FOREIGN KEY ("originOperationId") REFERENCES "BatchOperation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchOperation" ADD CONSTRAINT "BatchOperation_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchLineage" ADD CONSTRAINT "BatchLineage_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "BatchOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchLineage" ADD CONSTRAINT "BatchLineage_parentBatchId_fkey" FOREIGN KEY ("parentBatchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchLineage" ADD CONSTRAINT "BatchLineage_childBatchId_fkey" FOREIGN KEY ("childBatchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchTransfer" ADD CONSTRAINT "BatchTransfer_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchTransfer" ADD CONSTRAINT "BatchTransfer_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchTransfer" ADD CONSTRAINT "BatchTransfer_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptConfirmation" ADD CONSTRAINT "ReceiptConfirmation_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "BatchTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptConfirmation" ADD CONSTRAINT "ReceiptConfirmation_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "BatchOperation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "BatchTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_recallCaseId_fkey" FOREIGN KEY ("recallCaseId") REFERENCES "RecallCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallCase" ADD CONSTRAINT "RecallCase_rootBatchId_fkey" FOREIGN KEY ("rootBatchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallCase" ADD CONSTRAINT "RecallCase_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallAffectedBatch" ADD CONSTRAINT "RecallAffectedBatch_recallCaseId_fkey" FOREIGN KEY ("recallCaseId") REFERENCES "RecallCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallAffectedBatch" ADD CONSTRAINT "RecallAffectedBatch_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallAlert" ADD CONSTRAINT "RecallAlert_recallCaseId_fkey" FOREIGN KEY ("recallCaseId") REFERENCES "RecallCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecallAlert" ADD CONSTRAINT "RecallAlert_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRecord" ADD CONSTRAINT "PriceRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRecord" ADD CONSTRAINT "PriceRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceRecord" ADD CONSTRAINT "PriceRecord_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmerShareRecord" ADD CONSTRAINT "FarmerShareRecord_priceRecordId_fkey" FOREIGN KEY ("priceRecordId") REFERENCES "PriceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
