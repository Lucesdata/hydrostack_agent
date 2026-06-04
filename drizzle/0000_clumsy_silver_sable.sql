CREATE TABLE "raw_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"source_record_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"payload_hash" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_updated_at" timestamp with time zone,
	"batch_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entidad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nit_canonico" text NOT NULL,
	"nit_dv" text,
	"nombre" text,
	"nivel_gobierno" text,
	"rama" text,
	"sector" text,
	"geografia_id" text,
	"raw_attrs" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geografia" (
	"codigo_divipola" text PRIMARY KEY NOT NULL,
	"departamento_codigo" text,
	"departamento_nombre" text,
	"municipio_codigo" text,
	"municipio_nombre" text
);
--> statement-breakpoint
CREATE TABLE "geografia_alias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"texto_normalizado" text NOT NULL,
	"codigo_divipola" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proveedor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nit_canonico" text NOT NULL,
	"nit_dv" text,
	"nit_valid_dv" boolean,
	"tipo_documento" text,
	"razon_social" text,
	"es_estructura_plural" boolean DEFAULT false NOT NULL,
	"raw_attrs" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contrato" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"secop_contrato_id" text NOT NULL,
	"proceso_id" uuid,
	"proveedor_id" uuid,
	"proveedor_raw" text,
	"entidad_id" uuid,
	"geografia_id" text,
	"objeto" text,
	"referencia" text,
	"modalidad" text,
	"tipo_contrato" text,
	"valor_inicial" numeric(20, 2),
	"valor_actual" numeric(20, 2),
	"fecha_firma" date,
	"fecha_inicio" date,
	"fecha_fin_inicial" date,
	"fecha_fin_actual" date,
	"estado_actual" text,
	"prorrogable" boolean,
	"valor_facturado" numeric(20, 2),
	"valor_pagado" numeric(20, 2),
	"valor_pendiente_pago" numeric(20, 2),
	"ultima_modificacion_at" timestamp with time zone,
	"raw_record_id_actual" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contrato_evento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contrato_id" uuid NOT NULL,
	"tipo_evento" text NOT NULL,
	"source_observed_at" timestamp with time zone,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"correlation_id" uuid,
	"valor_anterior" numeric(20, 2),
	"valor_nuevo" numeric(20, 2),
	"fecha_anterior" date,
	"fecha_nueva" date,
	"estado_anterior" text,
	"estado_nuevo" text,
	"proveedor_anterior_id" uuid,
	"proveedor_nuevo_id" uuid,
	"delta" jsonb,
	"raw_record_id" uuid
);
--> statement-breakpoint
CREATE TABLE "proceso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"secop_proceso_id" text NOT NULL,
	"portafolio_id" text,
	"referencia" text,
	"entidad_id" uuid,
	"geografia_id" text,
	"modalidad" text,
	"tipo_contrato" text,
	"objeto" text,
	"valor_estimado" numeric(20, 2),
	"fecha_publicacion" date,
	"estado_actual" text,
	"estado_codigo" text,
	"raw_record_id_actual" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"watermark_from" text,
	"watermark_to" text,
	"records_ingested" integer DEFAULT 0 NOT NULL,
	"records_failed" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"error_summary" text,
	"batch_id" uuid
);
--> statement-breakpoint
CREATE TABLE "clasificacion_sectorial" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contrato_id" uuid,
	"proceso_id" uuid,
	"sector_score" numeric(5, 4),
	"sector_tier" text,
	"sector_agua" boolean DEFAULT false NOT NULL,
	"sector_match_reason" jsonb,
	"clasificador_version" text NOT NULL,
	"clasificado_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entidad" ADD CONSTRAINT "entidad_geografia_id_geografia_codigo_divipola_fk" FOREIGN KEY ("geografia_id") REFERENCES "public"."geografia"("codigo_divipola") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geografia_alias" ADD CONSTRAINT "geografia_alias_codigo_divipola_geografia_codigo_divipola_fk" FOREIGN KEY ("codigo_divipola") REFERENCES "public"."geografia"("codigo_divipola") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_proceso_id_proceso_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."proceso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_proveedor_id_proveedor_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_entidad_id_entidad_id_fk" FOREIGN KEY ("entidad_id") REFERENCES "public"."entidad"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_geografia_id_geografia_codigo_divipola_fk" FOREIGN KEY ("geografia_id") REFERENCES "public"."geografia"("codigo_divipola") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_raw_record_id_actual_raw_record_id_fk" FOREIGN KEY ("raw_record_id_actual") REFERENCES "public"."raw_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato_evento" ADD CONSTRAINT "contrato_evento_contrato_id_contrato_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contrato"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato_evento" ADD CONSTRAINT "contrato_evento_proveedor_anterior_id_proveedor_id_fk" FOREIGN KEY ("proveedor_anterior_id") REFERENCES "public"."proveedor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato_evento" ADD CONSTRAINT "contrato_evento_proveedor_nuevo_id_proveedor_id_fk" FOREIGN KEY ("proveedor_nuevo_id") REFERENCES "public"."proveedor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato_evento" ADD CONSTRAINT "contrato_evento_raw_record_id_raw_record_id_fk" FOREIGN KEY ("raw_record_id") REFERENCES "public"."raw_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proceso" ADD CONSTRAINT "proceso_entidad_id_entidad_id_fk" FOREIGN KEY ("entidad_id") REFERENCES "public"."entidad"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proceso" ADD CONSTRAINT "proceso_geografia_id_geografia_codigo_divipola_fk" FOREIGN KEY ("geografia_id") REFERENCES "public"."geografia"("codigo_divipola") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proceso" ADD CONSTRAINT "proceso_raw_record_id_actual_raw_record_id_fk" FOREIGN KEY ("raw_record_id_actual") REFERENCES "public"."raw_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clasificacion_sectorial" ADD CONSTRAINT "clasificacion_sectorial_contrato_id_contrato_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contrato"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clasificacion_sectorial" ADD CONSTRAINT "clasificacion_sectorial_proceso_id_proceso_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."proceso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "raw_record_source_recid_updated_idx" ON "raw_record" USING btree ("source","source_record_id","source_updated_at");--> statement-breakpoint
CREATE INDEX "raw_record_source_hash_idx" ON "raw_record" USING btree ("source","payload_hash");--> statement-breakpoint
CREATE INDEX "raw_record_batch_idx" ON "raw_record" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "raw_record_payload_gin_idx" ON "raw_record" USING gin ("payload");--> statement-breakpoint
CREATE UNIQUE INDEX "entidad_nit_uq" ON "entidad" USING btree ("nit_canonico");--> statement-breakpoint
CREATE UNIQUE INDEX "geografia_alias_texto_uq" ON "geografia_alias" USING btree ("texto_normalizado");--> statement-breakpoint
CREATE UNIQUE INDEX "proveedor_nit_uq" ON "proveedor" USING btree ("nit_canonico");--> statement-breakpoint
CREATE UNIQUE INDEX "contrato_secop_id_uq" ON "contrato" USING btree ("secop_contrato_id");--> statement-breakpoint
CREATE INDEX "contrato_proveedor_idx" ON "contrato" USING btree ("proveedor_id");--> statement-breakpoint
CREATE INDEX "contrato_entidad_idx" ON "contrato" USING btree ("entidad_id");--> statement-breakpoint
CREATE INDEX "contrato_estado_idx" ON "contrato" USING btree ("estado_actual");--> statement-breakpoint
CREATE INDEX "contrato_evento_contrato_obs_idx" ON "contrato_evento" USING btree ("contrato_id","source_observed_at");--> statement-breakpoint
CREATE INDEX "contrato_evento_tipo_obs_idx" ON "contrato_evento" USING btree ("tipo_evento","source_observed_at");--> statement-breakpoint
CREATE INDEX "contrato_evento_correlation_idx" ON "contrato_evento" USING btree ("correlation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "proceso_secop_id_uq" ON "proceso" USING btree ("secop_proceso_id");--> statement-breakpoint
CREATE INDEX "proceso_portafolio_idx" ON "proceso" USING btree ("portafolio_id");--> statement-breakpoint
CREATE INDEX "sync_log_source_status_idx" ON "sync_log" USING btree ("source","status");--> statement-breakpoint
CREATE INDEX "clasif_contrato_idx" ON "clasificacion_sectorial" USING btree ("contrato_id");--> statement-breakpoint
CREATE INDEX "clasif_proceso_idx" ON "clasificacion_sectorial" USING btree ("proceso_id");--> statement-breakpoint
CREATE INDEX "clasif_agua_idx" ON "clasificacion_sectorial" USING btree ("sector_agua");