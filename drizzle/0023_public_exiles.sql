ALTER TABLE "raw_record" ALTER COLUMN "payload" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contrato" ADD COLUMN "unspsc" text;--> statement-breakpoint
ALTER TABLE "contrato" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "descripcion" text;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "unspsc" text;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "fase" text;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "adjudicado" boolean;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "valor_adjudicacion" numeric(20, 2);--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "adjudicatario" text;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "nit_adjudicatario" text;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "fecha_adjudicacion" date;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "estado_apertura" text;--> statement-breakpoint
ALTER TABLE "proceso" ADD COLUMN "fecha_recepcion" date;