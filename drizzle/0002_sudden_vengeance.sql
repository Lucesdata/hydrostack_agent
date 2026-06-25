ALTER TABLE "proceso" ADD COLUMN "document_access" text;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "document_access_reason" text;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "document_access_method" text;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "document_access_evaluated_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "proceso_doc_access_idx" ON "proceso" USING btree ("document_access");