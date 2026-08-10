CREATE TABLE "conversacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"contexto" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"tipo" text NOT NULL,
	"contexto" text NOT NULL,
	"nombre_archivo" text NOT NULL,
	"ruta_storage" text NOT NULL,
	"texto_extraido" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lista_espera_mercado" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mensaje" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversacion_id" uuid NOT NULL,
	"rol" text NOT NULL,
	"contenido" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversacion" ADD CONSTRAINT "conversacion_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documento" ADD CONSTRAINT "documento_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lista_espera_mercado" ADD CONSTRAINT "lista_espera_mercado_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensaje" ADD CONSTRAINT "mensaje_conversacion_id_conversacion_id_fk" FOREIGN KEY ("conversacion_id") REFERENCES "public"."conversacion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conversacion_usuario_contexto_uq" ON "conversacion" USING btree ("usuario_id","contexto");--> statement-breakpoint
CREATE INDEX "documento_usuario_contexto_idx" ON "documento" USING btree ("usuario_id","contexto");--> statement-breakpoint
CREATE UNIQUE INDEX "lista_espera_mercado_usuario_uq" ON "lista_espera_mercado" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "mensaje_conversacion_idx" ON "mensaje" USING btree ("conversacion_id");