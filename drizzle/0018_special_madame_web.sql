CREATE TABLE "al_descartes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"capa" text NOT NULL,
	"account_id" text,
	"filtro_id" uuid,
	"secop_proceso_id" text NOT NULL,
	"objeto_resumen" text,
	"unspsc_observado" text,
	"valor_estimado" numeric(20, 2),
	"entidad_nit" text,
	"divipola" text,
	"motivo" text NOT NULL,
	"evidencia" jsonb,
	"red_version" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "al_descartes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "al_filtros_usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"usuario_id" text NOT NULL,
	"nombre" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"unspsc" text[],
	"palabras_clave" text[],
	"palabras_excluidas" text[],
	"entidades_nit" text[],
	"divipola" text[],
	"modalidades" text[],
	"valor_min" numeric(20, 2),
	"valor_max" numeric(20, 2),
	"eventos_notificables" text[] DEFAULT ARRAY['apertura','adenda','adjudicacion']::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "al_filtros_usuario" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "al_proceso_evento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proceso_id" uuid NOT NULL,
	"secop_proceso_id" text NOT NULL,
	"tipo_evento" text NOT NULL,
	"source_observed_at" timestamp with time zone,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"estado_anterior" text,
	"estado_nuevo" text,
	"valor_anterior" numeric(20, 2),
	"valor_nuevo" numeric(20, 2),
	"fecha_cierre_anterior" date,
	"fecha_cierre_nueva" date,
	"delta" jsonb,
	"raw_record_id" uuid,
	"payload_hash" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "al_proceso_evento" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "al_reportes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"visibilidad" text DEFAULT 'privado' NOT NULL,
	"account_id" text,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"parametros" jsonb NOT NULL,
	"payload" jsonb NOT NULL,
	"generado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"vistas" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "al_reportes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "al_sanciones_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fuente" text NOT NULL,
	"nit_canonico" text NOT NULL,
	"payload" jsonb,
	"estado" text NOT NULL,
	"tiene_hallazgo" boolean,
	"consultado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_en" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "al_sanciones_cache" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "al_descartes" ADD CONSTRAINT "al_descartes_filtro_id_al_filtros_usuario_id_fk" FOREIGN KEY ("filtro_id") REFERENCES "public"."al_filtros_usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "al_filtros_usuario" ADD CONSTRAINT "al_filtros_usuario_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "al_proceso_evento" ADD CONSTRAINT "al_proceso_evento_proceso_id_proceso_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."proceso"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "al_proceso_evento" ADD CONSTRAINT "al_proceso_evento_raw_record_id_raw_record_id_fk" FOREIGN KEY ("raw_record_id") REFERENCES "public"."raw_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "al_descartes_capa_motivo_idx" ON "al_descartes" USING btree ("capa","motivo");--> statement-breakpoint
CREATE INDEX "al_descartes_creado_idx" ON "al_descartes" USING btree ("creado_en");--> statement-breakpoint
CREATE INDEX "al_descartes_account_idx" ON "al_descartes" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "al_filtros_account_idx" ON "al_filtros_usuario" USING btree ("account_id","activo");--> statement-breakpoint
CREATE INDEX "al_filtros_usuario_idx" ON "al_filtros_usuario" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "al_proceso_evento_idem_uq" ON "al_proceso_evento" USING btree ("proceso_id","tipo_evento","payload_hash");--> statement-breakpoint
CREATE INDEX "al_proceso_evento_detected_idx" ON "al_proceso_evento" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "al_proceso_evento_proceso_idx" ON "al_proceso_evento" USING btree ("secop_proceso_id");--> statement-breakpoint
CREATE UNIQUE INDEX "al_reportes_slug_uq" ON "al_reportes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "al_reportes_account_idx" ON "al_reportes" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "al_reportes_tipo_idx" ON "al_reportes" USING btree ("tipo");--> statement-breakpoint
CREATE UNIQUE INDEX "al_sanciones_cache_fuente_nit_uq" ON "al_sanciones_cache" USING btree ("fuente","nit_canonico");--> statement-breakpoint
CREATE INDEX "al_sanciones_cache_expira_idx" ON "al_sanciones_cache" USING btree ("expira_en");