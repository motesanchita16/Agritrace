-- Database-level integrity rules Prisma cannot express.
-- Apply as a migration: see docs/database.md ("Integrity migration").
-- Table/column names are Prisma defaults (quoted, camelCase).

ALTER TABLE "Batch"
  ADD CONSTRAINT batch_qty_positive CHECK ("initialQuantityGrams" > 0),
  ADD CONSTRAINT batch_qty_bounds   CHECK ("currentQuantityGrams" >= 0 AND "currentQuantityGrams" <= "initialQuantityGrams");

-- Mass balance: input = outputs + documented loss (registrations have no input).
ALTER TABLE "BatchOperation"
  ADD CONSTRAINT op_nonnegative CHECK ("inputGrams" >= 0 AND "outputGrams" > 0 AND "lossGrams" >= 0),
  ADD CONSTRAINT op_mass_balance CHECK (type = 'REGISTER' OR "inputGrams" = "outputGrams" + "lossGrams");

ALTER TABLE "BatchLineage"
  ADD CONSTRAINT lineage_qty_positive CHECK ("contributedGrams" > 0),
  ADD CONSTRAINT lineage_no_self_parent CHECK ("parentBatchId" <> "childBatchId");

ALTER TABLE "BatchTransfer"
  ADD CONSTRAINT transfer_qty CHECK ("declaredGrams" > 0 AND ("measuredGrams" IS NULL OR "measuredGrams" >= 0)),
  ADD CONSTRAINT transfer_parties CHECK ("senderId" <> "recipientId");

ALTER TABLE "ReceiptConfirmation"
  ADD CONSTRAINT receipt_qty CHECK ("measuredGrams" >= 0);

ALTER TABLE "Evidence"
  ADD CONSTRAINT evidence_sha256_hex CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT evidence_size CHECK ("sizeBytes" >= 0);

ALTER TABLE "Certification"
  ADD CONSTRAINT cert_has_subject CHECK ("farmId" IS NOT NULL OR "batchId" IS NOT NULL);

ALTER TABLE "PriceRecord"
  ADD CONSTRAINT price_nonnegative CHECK ("totalAmount" >= 0 AND "quantityGrams" > 0);

-- Application-level append-only audit log (not a substitute for an external tamper-proof log).
CREATE OR REPLACE FUNCTION audit_log_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update_delete
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
