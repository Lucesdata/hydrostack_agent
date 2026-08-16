CREATE TABLE "coincidencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"proceso_id" text NOT NULL,
	"veredicto_overall" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"vista_en" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "coincidencia" ADD CONSTRAINT "coincidencia_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coincidencia_usuario_proceso_uq" ON "coincidencia" USING btree ("usuario_id","proceso_id");--> statement-breakpoint
CREATE INDEX "coincidencia_usuario_no_vista_idx" ON "coincidencia" USING btree ("usuario_id","vista_en");