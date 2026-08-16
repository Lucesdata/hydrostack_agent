ALTER TABLE "contrato_evento" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "contrato_evento" CASCADE;--> statement-breakpoint
CREATE UNIQUE INDEX "raw_record_source_recid_uq" ON "raw_record" USING btree ("source","source_record_id");