/**
 * Trigger `on_auth_user_deleted` (drizzle/0025): borrar una cuenta en Supabase
 * Auth borra su espejo en `usuario`, y las FK en cascada se llevan sus datos.
 *
 * Se borra con el rol `supabase_auth_admin`, como lo hace GoTrue desde el
 * dashboard o la API admin: ese rol no tiene permisos sobre `public`, y si el
 * trigger fallara por eso, la cuenta tampoco se podría borrar en Auth.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { crearBaseDePrueba } from "../helpers/base-pglite";

const ID_BORRADO = "11111111-1111-4111-8111-111111111111";
const ID_OTRO = "33333333-3333-4333-8333-333333333333";
const ID_SIN_ESPEJO = "44444444-4444-4444-8444-444444444444";

let client: PGlite;

async function altaCompleta(id: string, email: string, procesoId: string) {
  await client.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
  await client.query("insert into usuario (id, email) values ($1, $2)", [id, email]);
  await client.query("insert into oferente_perfil (usuario_id, perfil) values ($1, '{}')", [id]);
  await client.query("insert into alerta_preferencias (usuario_id) values ($1)", [id]);
  await client.query(
    `insert into envio_log (usuario_id, fecha, tipo, matches, estado)
     values ($1, '2026-09-01', 'diario', 3, 'enviado')`,
    [id]
  );
  await client.query(
    "insert into coincidencia (usuario_id, proceso_id, veredicto_overall) values ($1, $2, 'PASS')",
    [id, procesoId]
  );
  await client.query(
    `insert into diagnostico (usuario_id, version, respuestas, puntaje_total, puntaje_areas, bloqueantes)
     values ($1, 'co-apsb-v1', '{}', 50, '{}', '{}')`,
    [id]
  );
  await client.query(
    `insert into pliego_proceso (proceso_id, subido_por_usuario_id, nombre_archivo, extraction,
       validation, origen, gate_matematico_pasado)
     values ($1, $2, 'pliego.pdf', '{}', '{}', '{}', true)`,
    [procesoId, id]
  );
}

async function borrarEnAuthComoGoTrue(id: string) {
  await client.query("set role supabase_auth_admin");
  try {
    await client.query("delete from auth.users where id = $1", [id]);
  } finally {
    await client.query("reset role");
  }
}

async function filasDe(id: string) {
  const r = await client.query<{ tabla: string; n: number }>(
    `select 'usuario' as tabla, count(*)::int as n from usuario where id = $1
     union all select 'oferente_perfil', count(*)::int from oferente_perfil where usuario_id = $1
     union all select 'alerta_preferencias', count(*)::int from alerta_preferencias where usuario_id = $1
     union all select 'envio_log', count(*)::int from envio_log where usuario_id = $1
     union all select 'coincidencia', count(*)::int from coincidencia where usuario_id = $1
     union all select 'diagnostico', count(*)::int from diagnostico where usuario_id = $1`,
    [id]
  );
  return Object.fromEntries(r.rows.map((f) => [f.tabla, f.n]));
}

const TODAS_EN = (n: number) => ({
  usuario: n,
  oferente_perfil: n,
  alerta_preferencias: n,
  envio_log: n,
  coincidencia: n,
  diagnostico: n,
});

beforeAll(async () => {
  ({ client } = await crearBaseDePrueba());
}, 60_000);

beforeEach(async () => {
  await client.exec("truncate usuario, pliego_proceso, auth.users cascade");
});

describe("trigger on_auth_user_deleted", () => {
  it("borrar la cuenta en Auth borra su espejo y sus datos, y no toca a nadie más", async () => {
    await altaCompleta(ID_BORRADO, "persona@ejemplo.co", "CO1.PCCNTR.1");
    await altaCompleta(ID_OTRO, "otra@ejemplo.co", "CO1.PCCNTR.3");

    await borrarEnAuthComoGoTrue(ID_BORRADO);

    expect(await filasDe(ID_BORRADO)).toEqual(TODAS_EN(0));
    expect(await filasDe(ID_OTRO)).toEqual(TODAS_EN(1));
    // El pliego es público: sobrevive, sin atribución a la cuenta borrada.
    const pliegos = await client.query<{
      proceso_id: string;
      subido_por_usuario_id: string | null;
    }>("select proceso_id, subido_por_usuario_id from pliego_proceso order by proceso_id");
    expect(pliegos.rows).toEqual([
      { proceso_id: "CO1.PCCNTR.1", subido_por_usuario_id: null },
      { proceso_id: "CO1.PCCNTR.3", subido_por_usuario_id: ID_OTRO },
    ]);
  });

  it("borrar una cuenta que nunca llegó a tener espejo no falla", async () => {
    // Pasa en la base viva: altas sin confirmar cuyo sync nunca corrió.
    await client.query("insert into auth.users (id, email) values ($1, $2)", [
      ID_SIN_ESPEJO,
      "sin-espejo@ejemplo.co",
    ]);

    await expect(borrarEnAuthComoGoTrue(ID_SIN_ESPEJO)).resolves.toBeUndefined();
  });

  it("la función del trigger no se puede ejecutar como anon ni authenticated", async () => {
    // Vive en `public`, que la Data API expone; Supabase les concede EXECUTE
    // por defecto a toda función nueva de ese esquema.
    const r = await client.query<{ anon: boolean; authenticated: boolean }>(
      `select has_function_privilege('anon', 'public.borrar_espejo_usuario()', 'EXECUTE') as anon,
              has_function_privilege('authenticated', 'public.borrar_espejo_usuario()', 'EXECUTE')
                as authenticated`
    );
    expect(r.rows[0]).toEqual({ anon: false, authenticated: false });
  });
});

describe("migraciones sin esquema auth", () => {
  it("se aplican igual en un Postgres local sin Supabase, sin crear el trigger", async () => {
    const { client: local } = await crearBaseDePrueba({ conAuth: false });

    const r = await local.query<{ n: number }>(
      "select count(*)::int as n from pg_trigger where tgname = 'on_auth_user_deleted'"
    );
    expect(r.rows[0].n).toBe(0);
    await local.close();
  }, 60_000);
});
