CREATE INDEX IF NOT EXISTS "contrato_proceso_idx" ON "contrato" USING btree ("proceso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proceso_geografia_tipo_idx" ON "proceso" USING btree ("geografia_id","tipo_proyecto");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "al_hist_proceso_idx" ON "al_oferentes_historico" USING btree ("proceso_id");