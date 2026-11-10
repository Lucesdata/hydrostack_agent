CREATE TABLE "ci_auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_tipo" text NOT NULL,
	"actor_id" text,
	"accion" text NOT NULL,
	"objeto_tipo" text,
	"objeto_id" text,
	"detalle" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ci_auditoria" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ci_consentimiento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"finalidad" text NOT NULL,
	"accion" text NOT NULL,
	"version_texto" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ci_consentimiento_finalidad_ck" CHECK ("ci_consentimiento"."finalidad" IN ('alertas_comerciales')),
	CONSTRAINT "ci_consentimiento_accion_ck" CHECK ("ci_consentimiento"."accion" IN ('alta','baja'))
);
--> statement-breakpoint
ALTER TABLE "ci_consentimiento" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ci_empresa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"razon_social" text NOT NULL,
	"pais" text NOT NULL,
	"registro_empresarial" text,
	"sitio_oficial" text,
	"cobertura_nacional" boolean DEFAULT false NOT NULL,
	"estado_verificacion" text DEFAULT 'sin_verificar' NOT NULL,
	"atributos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ci_empresa_pais_ck" CHECK (char_length("ci_empresa"."pais") = 2),
	CONSTRAINT "ci_empresa_verificacion_ck" CHECK ("ci_empresa"."estado_verificacion" IN ('sin_verificar','en_revision','verificada','rechazada','revocada'))
);
--> statement-breakpoint
ALTER TABLE "ci_empresa" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ci_empresa_capacidad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nodo_codigo" text NOT NULL,
	"taxonomia_version" text NOT NULL,
	"estado_dato" text NOT NULL,
	"marcas" text[],
	"especificaciones" jsonb,
	CONSTRAINT "ci_empresa_capacidad_estado_ck" CHECK ("ci_empresa_capacidad"."estado_dato" IN ('declarado','documentado','verificado'))
);
--> statement-breakpoint
ALTER TABLE "ci_empresa_capacidad" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ci_empresa_cobertura" (
	"empresa_id" uuid NOT NULL,
	"divipola" text NOT NULL,
	"estado_dato" text NOT NULL,
	CONSTRAINT "ci_empresa_cobertura_empresa_id_divipola_pk" PRIMARY KEY("empresa_id","divipola"),
	CONSTRAINT "ci_empresa_cobertura_divipola_ck" CHECK ("ci_empresa_cobertura"."divipola" ~ '^[0-9]{2}([0-9]{3})?$'),
	CONSTRAINT "ci_empresa_cobertura_estado_ck" CHECK ("ci_empresa_cobertura"."estado_dato" IN ('declarado','documentado','verificado'))
);
--> statement-breakpoint
ALTER TABLE "ci_empresa_cobertura" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ci_empresa_rol" (
	"empresa_id" uuid NOT NULL,
	"rol" text NOT NULL,
	"estado_dato" text NOT NULL,
	CONSTRAINT "ci_empresa_rol_empresa_id_rol_pk" PRIMARY KEY("empresa_id","rol"),
	CONSTRAINT "ci_empresa_rol_rol_ck" CHECK ("ci_empresa_rol"."rol" IN ('fabricante_internacional','fabricante_colombiano','distribuidor_autorizado','representante_comercial','importador','integrador_tecnologico','empresa_ingenieria','empresa_constructora','prestador_servicios_especializados','consultora','instalacion_mantenimiento','operador_infraestructura')),
	CONSTRAINT "ci_empresa_rol_estado_ck" CHECK ("ci_empresa_rol"."estado_dato" IN ('declarado','documentado','verificado'))
);
--> statement-breakpoint
ALTER TABLE "ci_empresa_rol" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ci_seguimiento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" text NOT NULL,
	"objeto_tipo" text NOT NULL,
	"objeto_id" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ci_seguimiento_tipo_ck" CHECK ("ci_seguimiento"."objeto_tipo" IN ('contrato','necesidad','contratista'))
);
--> statement-breakpoint
ALTER TABLE "ci_seguimiento" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ci_consentimiento" ADD CONSTRAINT "ci_consentimiento_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ci_empresa" ADD CONSTRAINT "ci_empresa_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ci_empresa_capacidad" ADD CONSTRAINT "ci_empresa_capacidad_empresa_id_ci_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."ci_empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ci_empresa_cobertura" ADD CONSTRAINT "ci_empresa_cobertura_empresa_id_ci_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."ci_empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ci_empresa_rol" ADD CONSTRAINT "ci_empresa_rol_empresa_id_ci_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."ci_empresa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ci_seguimiento" ADD CONSTRAINT "ci_seguimiento_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ci_auditoria_actor_idx" ON "ci_auditoria" USING btree ("actor_id","creado_en" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ci_auditoria_objeto_idx" ON "ci_auditoria" USING btree ("objeto_tipo","objeto_id");--> statement-breakpoint
CREATE INDEX "ci_consentimiento_vigente_idx" ON "ci_consentimiento" USING btree ("usuario_id","finalidad","creado_en" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "ci_empresa_usuario_uq" ON "ci_empresa" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "ci_empresa_pais_idx" ON "ci_empresa" USING btree ("pais");--> statement-breakpoint
CREATE UNIQUE INDEX "ci_empresa_capacidad_empresa_nodo_uq" ON "ci_empresa_capacidad" USING btree ("empresa_id","nodo_codigo");--> statement-breakpoint
CREATE INDEX "ci_empresa_capacidad_nodo_idx" ON "ci_empresa_capacidad" USING btree ("nodo_codigo");--> statement-breakpoint
CREATE UNIQUE INDEX "ci_seguimiento_unico_uq" ON "ci_seguimiento" USING btree ("usuario_id","objeto_tipo","objeto_id");
--> statement-breakpoint
-- Escrito a mano (Drizzle no modela triggers). Tablas de solo anexado: el
-- consentimiento es la prueba (Ley 1581) y la auditoría es inmutable. La única
-- excepción es la supresión de la cuenta: el DELETE en cascada por FK corre con
-- pg_trigger_depth() > 1 y se permite (derecho de supresión). Un DELETE o UPDATE
-- directo, en cambio, se rechaza.
CREATE FUNCTION ci_rechazar_modificacion() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'tabla de solo anexado: % no admite %', TG_TABLE_NAME, TG_OP;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER ci_consentimiento_solo_anexado
  BEFORE UPDATE OR DELETE ON ci_consentimiento
  FOR EACH ROW EXECUTE FUNCTION ci_rechazar_modificacion();
--> statement-breakpoint
CREATE TRIGGER ci_auditoria_solo_anexado
  BEFORE UPDATE OR DELETE ON ci_auditoria
  FOR EACH ROW EXECUTE FUNCTION ci_rechazar_modificacion();
