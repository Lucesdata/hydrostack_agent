ALTER TABLE "contrato" ADD COLUMN "origen_recursos" text;--> statement-breakpoint
ALTER TABLE "contrato" ADD COLUMN "destino_gasto" text;--> statement-breakpoint
ALTER TABLE "contrato" ADD COLUMN "fuentes_recursos" jsonb;--> statement-breakpoint
ALTER TABLE "contrato" ADD COLUMN "dias_adicionados" integer;--> statement-breakpoint
ALTER TABLE "contrato" ADD COLUMN "liquidado" boolean;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "duracion_valor" integer;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "duracion_unidad" text;