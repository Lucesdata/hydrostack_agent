CREATE TABLE "al_oferentes_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"secop_proceso_id" text NOT NULL,
	"proceso_id" uuid,
	"proveedor_key" text NOT NULL,
	"proveedor_nit" text,
	"proveedor_nombre" text NOT NULL,
	"proveedor_id" uuid,
	"adjudicado" boolean NOT NULL,
	"entidad_id" uuid,
	"entidad_nit" text,
	"geografia_id" text,
	"unspsc" text,
	"modalidad" text,
	"valor_estimado" numeric(20, 2),
	"valor_adjudicado" numeric(20, 2),
	"fecha_adjudicacion" date,
	"fecha_publicacion" date,
	"fuente" text NOT NULL,
	"raw_record_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "al_oferentes_historico" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "al_oferentes_historico" ADD CONSTRAINT "al_oferentes_historico_proceso_id_proceso_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."proceso"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "al_oferentes_historico" ADD CONSTRAINT "al_oferentes_historico_proveedor_id_proveedor_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "al_oferentes_historico" ADD CONSTRAINT "al_oferentes_historico_entidad_id_entidad_id_fk" FOREIGN KEY ("entidad_id") REFERENCES "public"."entidad"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "al_oferentes_historico" ADD CONSTRAINT "al_oferentes_historico_geografia_id_geografia_codigo_divipola_fk" FOREIGN KEY ("geografia_id") REFERENCES "public"."geografia"("codigo_divipola") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "al_oferentes_historico" ADD CONSTRAINT "al_oferentes_historico_raw_record_id_raw_record_id_fk" FOREIGN KEY ("raw_record_id") REFERENCES "public"."raw_record"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "al_hist_proceso_proveedor_uq" ON "al_oferentes_historico" USING btree ("secop_proceso_id","proveedor_key");--> statement-breakpoint
CREATE INDEX "al_hist_proveedor_fecha_idx" ON "al_oferentes_historico" USING btree ("proveedor_nit","fecha_adjudicacion");--> statement-breakpoint
CREATE INDEX "al_hist_entidad_fecha_idx" ON "al_oferentes_historico" USING btree ("entidad_id","fecha_adjudicacion");--> statement-breakpoint
CREATE INDEX "al_hist_unspsc_idx" ON "al_oferentes_historico" USING btree ("unspsc");--> statement-breakpoint
CREATE INDEX "al_hist_adjudicado_idx" ON "al_oferentes_historico" USING btree ("adjudicado");