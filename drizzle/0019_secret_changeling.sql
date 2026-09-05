ALTER TABLE "alerta_preferencias" ADD COLUMN "account_id" text;--> statement-breakpoint
ALTER TABLE "alerta_preferencias" ADD COLUMN "eventos_notificables" text[];--> statement-breakpoint
ALTER TABLE "coincidencia" ADD COLUMN "account_id" text;--> statement-breakpoint
ALTER TABLE "coincidencia" ADD COLUMN "filtro_id" uuid;--> statement-breakpoint
ALTER TABLE "envio_log" ADD COLUMN "account_id" text;--> statement-breakpoint
ALTER TABLE "envio_log" ADD COLUMN "reporte_id" uuid;--> statement-breakpoint
ALTER TABLE "envio_log" ADD COLUMN "proveedor_mensaje_id" text;--> statement-breakpoint
ALTER TABLE "envio_log" ADD COLUMN "estado_entrega" text;--> statement-breakpoint
ALTER TABLE "envio_log" ADD COLUMN "entrega_actualizada_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "coincidencia" ADD CONSTRAINT "coincidencia_filtro_id_al_filtros_usuario_id_fk" FOREIGN KEY ("filtro_id") REFERENCES "public"."al_filtros_usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envio_log" ADD CONSTRAINT "envio_log_reporte_id_al_reportes_id_fk" FOREIGN KEY ("reporte_id") REFERENCES "public"."al_reportes"("id") ON DELETE set null ON UPDATE no action;