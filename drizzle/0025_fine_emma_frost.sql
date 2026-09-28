-- Bloquea nuevas escrituras entre la comprobación y la eliminación.
LOCK TABLE "lista_espera_mercado" IN ACCESS EXCLUSIVE MODE;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "lista_espera_mercado" LIMIT 1) THEN
    RAISE EXCEPTION 'No se elimina lista_espera_mercado: contiene filas. Revisar y preservar los datos antes de migrar.';
  END IF;
END
$$;--> statement-breakpoint
-- RESTRICT impide eliminar objetos dependientes que no conocemos.
DROP TABLE "lista_espera_mercado" RESTRICT;
