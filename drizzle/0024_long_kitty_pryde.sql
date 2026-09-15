ALTER TABLE "proceso" ADD COLUMN "tipo_proyecto" text;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "tipo_proyecto_confianza" text;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "tipo_proyecto_segundo" text;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "tipo_proyecto_version" text;--> statement-breakpoint
CREATE INDEX "proceso_tipo_proyecto_idx" ON "proceso" USING btree ("tipo_proyecto");