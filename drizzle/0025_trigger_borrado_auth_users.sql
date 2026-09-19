-- Borrar una cuenta en Supabase Auth borra su espejo en `usuario` (2026-09-19).
-- Hecho a mano: Drizzle no modela triggers. PENDIENTES §39.
--
-- `auth.users` y `public.usuario` viven en el mismo Postgres sin FK entre ellos:
-- hasta aquí, borrar una cuenta en el dashboard dejaba su fila y todo lo que
-- cuelga de ella (perfil, alertas, envíos, coincidencias, diagnóstico,
-- documentos, conversaciones). Este trigger la borra en el momento y las FK en
-- cascada hacen el resto; `pliego_proceso` queda con `SET NULL` porque el pliego
-- es público.
--
-- Decisiones, verificadas contra la base viva el 2026-09-19:
-- · SECURITY DEFINER. GoTrue borra con el rol `supabase_auth_admin`, que no es
--   superusuario, no ignora RLS y no tiene permisos sobre `public`. Sin esto el
--   DELETE del trigger fallaría y, con él, el borrado de la cuenta en Auth
--   ("Database error deleting user"). La función corre como su dueño: hay que
--   aplicar esta migración como `postgres` (el rol de DATABASE_URL), que es dueño
--   de `usuario` e ignora RLS.
-- · `search_path = ''` y nombres calificados: una función SECURITY DEFINER no
--   debe resolver nombres con el search_path de quien la dispara.
-- · REVOKE EXECUTE. Vive en `public`, que la Data API expone, y Supabase concede
--   EXECUTE por defecto a `anon` y `authenticated` sobre toda función nueva ahí.
--   Un trigger no comprueba EXECUTE al dispararse, así que revocarlo no le afecta.
-- · Si el DELETE falla, falla también el borrado en Auth: mejor eso que una
--   cuenta borrada con sus datos a medias.
-- · Sin `auth.users` (Postgres local con DB_DRIVER=node, sin Supabase) no se crea
--   el trigger y la migración pasa igual.
--
-- No cubre: el borrado suave de la API admin (`shouldSoftDelete`), que no borra
-- la fila de `auth.users`; los archivos en Supabase Storage; ni las filas
-- huérfanas anteriores a esta migración (de esas se encarga `syncUsuario` si el
-- correo vuelve a registrarse).

CREATE FUNCTION public.borrar_espejo_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.usuario WHERE id = OLD.id::text;
  RETURN OLD;
END;
$$;--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION public.borrar_espejo_usuario() FROM PUBLIC;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE EXECUTE ON FUNCTION public.borrar_espejo_usuario() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE EXECUTE ON FUNCTION public.borrar_espejo_usuario() FROM authenticated;
  END IF;

  IF to_regclass('auth.users') IS NULL THEN
    RAISE NOTICE 'auth.users no existe (Postgres sin Supabase): no se crea on_auth_user_deleted';
  ELSE
    CREATE TRIGGER on_auth_user_deleted
      AFTER DELETE ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.borrar_espejo_usuario();
  END IF;
END
$$;
