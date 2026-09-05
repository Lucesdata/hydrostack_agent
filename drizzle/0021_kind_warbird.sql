CREATE TABLE "al_sanciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fuente" text NOT NULL,
	"registro_key" text NOT NULL,
	"documento" text,
	"nit_canonico" text,
	"proveedor_nombre" text,
	"proveedor_id" uuid,
	"portafolio_id" text,
	"proceso_id" uuid,
	"entidad_nit" text,
	"entidad_nombre" text,
	"tipo" text,
	"valor_sancion" numeric(20, 2),
	"numero_acto" text,
	"numero_contrato" text,
	"fecha_firmeza" date,
	"fecha_publicacion" date,
	"url_proceso" text,
	"payload" jsonb,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "al_sanciones" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "al_sanciones" ADD CONSTRAINT "al_sanciones_proveedor_id_proveedor_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "al_sanciones" ADD CONSTRAINT "al_sanciones_proceso_id_proceso_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."proceso"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "al_sanciones_registro_uq" ON "al_sanciones" USING btree ("fuente","registro_key");--> statement-breakpoint
CREATE INDEX "al_sanciones_nit_idx" ON "al_sanciones" USING btree ("nit_canonico");--> statement-breakpoint
CREATE INDEX "al_sanciones_portafolio_idx" ON "al_sanciones" USING btree ("portafolio_id");--> statement-breakpoint
CREATE INDEX "al_sanciones_proceso_idx" ON "al_sanciones" USING btree ("proceso_id");