CREATE TABLE "al_proceso_estado" (
	"secop_proceso_id" text PRIMARY KEY NOT NULL,
	"estado" text,
	"estado_apertura" text,
	"valor_estimado" numeric(20, 2),
	"modalidad" text,
	"fecha_recepcion" date,
	"adjudicado" boolean,
	"valor_adjudicado" numeric(20, 2),
	"adjudicatario_nit" text,
	"objeto_hash" text,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "al_proceso_estado" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "al_proceso_estado_actualizado_idx" ON "al_proceso_estado" USING btree ("actualizado_en");