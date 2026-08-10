CREATE TABLE "requisitos_proceso" (
	"proceso_id" text PRIMARY KEY NOT NULL,
	"requisitos" jsonb NOT NULL,
	"extraido_en" timestamp with time zone DEFAULT now() NOT NULL
);
