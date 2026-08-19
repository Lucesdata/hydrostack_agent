CREATE TABLE "pliego_proceso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proceso_id" text NOT NULL,
	"subido_por_usuario_id" text,
	"nombre_archivo" text NOT NULL,
	"extraction" jsonb NOT NULL,
	"validation" jsonb NOT NULL,
	"origen" jsonb NOT NULL,
	"gate_matematico_pasado" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pliego_proceso" ADD CONSTRAINT "pliego_proceso_subido_por_usuario_id_usuario_id_fk" FOREIGN KEY ("subido_por_usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pliego_proceso_proceso_id_uq" ON "pliego_proceso" USING btree ("proceso_id");--> statement-breakpoint
CREATE INDEX "pliego_proceso_gate_idx" ON "pliego_proceso" USING btree ("gate_matematico_pasado");