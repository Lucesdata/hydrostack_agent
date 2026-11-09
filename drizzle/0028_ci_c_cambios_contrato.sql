CREATE TABLE "ci_contrato_cambio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contrato_id" uuid NOT NULL,
	"campo" text NOT NULL,
	"valor_anterior" text,
	"valor_nuevo" text,
	"detectado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ci_contrato_cambio_campo_ck" CHECK ("ci_contrato_cambio"."campo" IN ('valor_actual','fecha_fin_actual','estado_actual'))
);
--> statement-breakpoint
ALTER TABLE "ci_contrato_cambio" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ci_contrato_estado" (
	"contrato_id" uuid PRIMARY KEY NOT NULL,
	"valor_actual" numeric(20, 2),
	"fecha_fin_actual" date,
	"estado_actual" text,
	"visto_en" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ci_contrato_estado" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ci_contrato_cambio" ADD CONSTRAINT "ci_contrato_cambio_contrato_id_contrato_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contrato"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ci_contrato_estado" ADD CONSTRAINT "ci_contrato_estado_contrato_id_contrato_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contrato"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ci_contrato_cambio_unico_uq" ON "ci_contrato_cambio" USING btree ("contrato_id","campo","valor_nuevo");--> statement-breakpoint
CREATE INDEX "ci_contrato_cambio_contrato_idx" ON "ci_contrato_cambio" USING btree ("contrato_id","detectado_en" DESC NULLS LAST);