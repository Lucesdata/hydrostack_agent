/**
 * `syncUsuario` contra un Postgres de verdad (PGlite), no contra un mock de `db`.
 *
 * El bug que cubre es de semántica SQL: `ON CONFLICT (id)` no cubre el índice
 * único de `email`, y un mock no tiene índices. Por eso el esquema no se escribe
 * a mano: se aplican las migraciones reales de `drizzle/`, y con ellas las once
 * FK que apuntan a `usuario` tal como existen en la base viva (verificado el
 * 2026-09-19: diez `ON DELETE CASCADE`, `pliego_proceso` con `SET NULL`).
 *
 * `auth.users` es de Supabase y no está en las migraciones: se simula con las
 * dos columnas que lee el código. La tabla real tiene un único parcial sobre
 * `email`; aquí se omite a propósito para poder representar el caso "la otra
 * cuenta sigue viva" (espejo desfasado tras un cambio de correo, o SSO).
 */
import path from "node:path";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";

vi.mock("@/src/lib/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/src/lib/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), pool: { end: () => client.close() }, schema };
});

import { db } from "@/src/lib/db/client";
import {
  usuario,
  oferentePerfil,
  alertaPreferencias,
  envioLog,
  coincidencia,
  diagnostico,
  pliegoProceso,
} from "@/src/lib/db/schema";
import { syncUsuario, ColisionEmailUsuarioError } from "@/src/lib/supabase/sync-usuario";

const ID_BORRADO = "11111111-1111-4111-8111-111111111111";
const ID_NUEVO = "22222222-2222-4222-8222-222222222222";
const ID_TERCERO = "33333333-3333-4333-8333-333333333333";
const EMAIL = "persona@ejemplo.co";

function authUser(id: string, email: string, fullName = "Persona"): User {
  return {
    id,
    email,
    app_metadata: {},
    user_metadata: { full_name: fullName },
    aud: "authenticated",
    created_at: "2026-09-19T00:00:00Z",
    email_confirmed_at: undefined,
  } as User;
}

async function altaEnAuth(id: string, email: string) {
  await db.execute(sql`insert into auth.users (id, email) values (${id}, ${email})`);
}

/** Una fila en cada tabla hija que cuelga de `usuario`. */
async function sembrarDatosDe(usuarioId: string, procesoId: string) {
  await db.insert(oferentePerfil).values({ usuarioId, perfil: { razonSocial: usuarioId } });
  await db.insert(alertaPreferencias).values({ usuarioId });
  await db
    .insert(envioLog)
    .values({ usuarioId, fecha: "2026-09-01", tipo: "diario", matches: 3, estado: "enviado" });
  await db.insert(coincidencia).values({ usuarioId, procesoId, veredictoOverall: "PASS" });
  await db.insert(diagnostico).values({
    usuarioId,
    version: "co-apsb-v1",
    respuestas: {},
    puntajeTotal: 50,
    puntajeAreas: {},
    bloqueantes: [],
  });
  await db.insert(pliegoProceso).values({
    procesoId,
    subidoPorUsuarioId: usuarioId,
    nombreArchivo: "pliego.pdf",
    extraction: {},
    validation: {},
    origen: {},
    gateMatematicoPasado: true,
  });
}

async function filasDe(usuarioId: string) {
  const contar = async (tabla: string) => {
    const r = await db.execute(
      sql`select count(*)::int as n from ${sql.identifier(tabla)} where usuario_id = ${usuarioId}`
    );
    return (r.rows[0] as { n: number }).n;
  };
  return {
    oferente_perfil: await contar("oferente_perfil"),
    alerta_preferencias: await contar("alerta_preferencias"),
    envio_log: await contar("envio_log"),
    coincidencia: await contar("coincidencia"),
    diagnostico: await contar("diagnostico"),
  };
}

const UNA_DE_CADA = {
  oferente_perfil: 1,
  alerta_preferencias: 1,
  envio_log: 1,
  coincidencia: 1,
  diagnostico: 1,
};
const NINGUNA = {
  oferente_perfil: 0,
  alerta_preferencias: 0,
  envio_log: 0,
  coincidencia: 0,
  diagnostico: 0,
};

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.execute(sql`create schema if not exists auth`);
  await db.execute(sql`create table auth.users (id uuid primary key, email text)`);
}, 60_000);

const avisos = vi.spyOn(console, "warn").mockImplementation(() => {});

beforeEach(async () => {
  avisos.mockClear();
  await db.execute(sql`truncate usuario, pliego_proceso, auth.users cascade`);
});

describe("syncUsuario", () => {
  it("un login repetido actualiza el espejo sin duplicar la fila", async () => {
    await altaEnAuth(ID_NUEVO, EMAIL);
    await syncUsuario(authUser(ID_NUEVO, EMAIL, "Nombre viejo"));
    await syncUsuario(authUser(ID_NUEVO, EMAIL, "Nombre nuevo"));

    const filas = await db.select().from(usuario);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ id: ID_NUEVO, email: EMAIL, name: "Nombre nuevo" });
  });

  describe("el correo ya está en `usuario` con otro id", () => {
    it("si la cuenta anterior ya no existe en Auth, el alta nueva no revienta", async () => {
      // La cuenta se borró en el dashboard de Supabase: su fila espejo quedó.
      await db.insert(usuario).values({ id: ID_BORRADO, email: EMAIL });
      await altaEnAuth(ID_NUEVO, EMAIL);

      await syncUsuario(authUser(ID_NUEVO, EMAIL));

      const filas = await db
        .select({ id: usuario.id })
        .from(usuario)
        .where(eq(usuario.email, EMAIL));
      expect(filas).toEqual([{ id: ID_NUEVO }]);
      // Queda rastro de la limpieza, por ids y sin el correo.
      expect(avisos).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(avisos.mock.calls)).toContain(ID_BORRADO);
      expect(JSON.stringify(avisos.mock.calls)).not.toContain(EMAIL);
    });

    it("los datos de la cuenta borrada se borran con ella y no pasan a la nueva", async () => {
      await db.insert(usuario).values({ id: ID_BORRADO, email: EMAIL });
      await sembrarDatosDe(ID_BORRADO, "CO1.PCCNTR.1");
      await altaEnAuth(ID_NUEVO, EMAIL);

      await syncUsuario(authUser(ID_NUEVO, EMAIL));

      // Mismo correo no prueba misma persona: el alta aún no confirmó el correo.
      expect(await filasDe(ID_NUEVO)).toEqual(NINGUNA);
      expect(await filasDe(ID_BORRADO)).toEqual(NINGUNA);
      // El pliego es público: sobrevive, sin atribución a la cuenta borrada.
      const [pliego] = await db.select().from(pliegoProceso);
      expect(pliego.subidoPorUsuarioId).toBeNull();
    });

    it("no toca a ningún otro usuario", async () => {
      await db.insert(usuario).values({ id: ID_TERCERO, email: "otra@ejemplo.co" });
      await sembrarDatosDe(ID_TERCERO, "CO1.PCCNTR.3");
      await altaEnAuth(ID_TERCERO, "otra@ejemplo.co");
      await db.insert(usuario).values({ id: ID_BORRADO, email: EMAIL });
      await altaEnAuth(ID_NUEVO, EMAIL);

      await syncUsuario(authUser(ID_NUEVO, EMAIL));

      expect(await filasDe(ID_TERCERO)).toEqual(UNA_DE_CADA);
      const [pliego] = await db.select().from(pliegoProceso);
      expect(pliego.subidoPorUsuarioId).toBe(ID_TERCERO);
    });

    it("si la cuenta anterior sigue viva en Auth, falla sin tocar su fila ni sus datos", async () => {
      await db.insert(usuario).values({ id: ID_BORRADO, email: EMAIL });
      await sembrarDatosDe(ID_BORRADO, "CO1.PCCNTR.1");
      await altaEnAuth(ID_BORRADO, EMAIL);
      await altaEnAuth(ID_NUEVO, EMAIL);

      await expect(syncUsuario(authUser(ID_NUEVO, EMAIL))).rejects.toBeInstanceOf(
        ColisionEmailUsuarioError
      );

      const filas = await db.select({ id: usuario.id }).from(usuario);
      expect(filas).toEqual([{ id: ID_BORRADO }]);
      expect(await filasDe(ID_BORRADO)).toEqual(UNA_DE_CADA);
    });
  });
});
