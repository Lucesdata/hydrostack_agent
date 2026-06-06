-- Fase 0.4 — Alineación de la canónica con D22-D26 y nueva tabla de cuarentena.
-- Hecho a mano (drizzle-kit pidió TTY interactivo para resolver el rename
-- sector → sector_administrativo). Cambios:
--
--   D22  · proveedor.nit_valid_dv : DROP COLUMN (la fuente no trae DV; nit_dv
--         es el calculado por nosotros con DIAN — no hay con qué validar).
--   D23  · entidad.sector → sector_administrativo : RENAME (es el sector PGN
--         del Estado, no el sector agua/saneamiento — esa pertenencia vive en
--         clasificacion_sectorial).
--   D23  · entidad.rama : DROP COLUMN (pasa a raw_attrs.rama, informativo).
--   0.4  · transform_quarantine : CREATE TABLE (errores estructurales del
--         transform raw → canónico; distinto de centinelas conocidos que van a
--         NULL legítimo).
--
-- Idempotente con IF EXISTS. Sin riesgo de pérdida de datos canónicos vivos
-- en esta fase (la canónica entra a poblarse después de esta migración).

ALTER TABLE "proveedor" DROP COLUMN IF EXISTS "nit_valid_dv";--> statement-breakpoint
ALTER TABLE "entidad" DROP COLUMN IF EXISTS "rama";--> statement-breakpoint
ALTER TABLE "entidad" RENAME COLUMN "sector" TO "sector_administrativo";--> statement-breakpoint

CREATE TABLE "transform_quarantine" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raw_record_id" uuid,
	"source" text NOT NULL,
	"source_record_id" text,
	"reason" text NOT NULL,
	"detail" jsonb,
	"batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "transform_quarantine" ADD CONSTRAINT "transform_quarantine_raw_record_id_raw_record_id_fk" FOREIGN KEY ("raw_record_id") REFERENCES "public"."raw_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quarantine_source_reason_idx" ON "transform_quarantine" USING btree ("source","reason");--> statement-breakpoint
CREATE INDEX "quarantine_batch_idx" ON "transform_quarantine" USING btree ("batch_id");
