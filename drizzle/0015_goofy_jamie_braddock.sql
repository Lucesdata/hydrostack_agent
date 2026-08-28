CREATE TABLE "diagnostico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text,
	"session_token" text,
	"version" text NOT NULL,
	"respuestas" jsonb NOT NULL,
	"puntaje_total" integer NOT NULL,
	"puntaje_areas" jsonb NOT NULL,
	"escalon" text NOT NULL,
	"bloqueantes" text[] NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"reclamado_en" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "diagnostico" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "diagnostico" ADD CONSTRAINT "diagnostico_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diagnostico_usuario_idx" ON "diagnostico" USING btree ("usuario_id","creado_en");--> statement-breakpoint
CREATE INDEX "diagnostico_session_idx" ON "diagnostico" USING btree ("session_token");