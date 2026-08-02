CREATE TABLE "alerta_preferencias" (
	"usuario_id" text PRIMARY KEY NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"hora_envio" smallint DEFAULT 7 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "envio_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"fecha" date NOT NULL,
	"tipo" text NOT NULL,
	"matches" integer NOT NULL,
	"estado" text NOT NULL,
	"enviado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerta_preferencias" ADD CONSTRAINT "alerta_preferencias_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envio_log" ADD CONSTRAINT "envio_log_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "envio_log_usuario_fecha_tipo_uq" ON "envio_log" USING btree ("usuario_id","fecha","tipo");