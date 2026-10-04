/**
 * «Seguir» contra un Postgres de verdad (PGlite con las migraciones reales,
 * 0025 incluida): aislamiento por cuenta, lo seguido por perfil o filtro no se
 * toca y lo manual se distingue.
 */
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";
import { and, eq } from "drizzle-orm";

vi.mock("@/src/lib/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/src/lib/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), pool: { end: () => client.close() }, schema };
});

import { db } from "@/src/lib/db/client";
import { coincidencia, proceso, usuario } from "@/src/lib/db/schema";
import { dejarDeSeguir, seguidos, seguir } from "@/src/lib/seguir/store";

const ANA = "u-ana";
const BETO = "u-beto";

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.insert(usuario).values([
    { id: ANA, email: "ana@example.com" },
    { id: BETO, email: "beto@example.com" },
  ]);
  const comun = { estadoApertura: "Abierto", estadoActual: "Publicado" };
  await db.insert(proceso).values([
    { ...comun, secopProcesoId: "CO1.REQ.1", objeto: "Acueducto" },
    { ...comun, secopProcesoId: "CO1.REQ.2", objeto: "PTAR" },
    { ...comun, secopProcesoId: "CO1.REQ.BORRADO", objeto: "Viejo", deletedAt: new Date() },
  ]);
  // Ana ya sigue CO1.REQ.2 por su perfil: fila sin account_id ni origen, como las
  // que escribe `recordCoincidencias`.
  await db
    .insert(coincidencia)
    .values({ usuarioId: ANA, procesoId: "CO1.REQ.2", veredictoOverall: "PASS" });
});

describe("seguir", () => {
  it("sigue un proceso vivo, y la segunda vez no duplica", async () => {
    expect(await seguir(ANA, ANA, "CO1.REQ.1")).toBe("siguiendo");
    expect(await seguir(ANA, ANA, "CO1.REQ.1")).toBe("ya-lo-seguia");
    const filas = await db
      .select({ origen: coincidencia.origen, accountId: coincidencia.accountId })
      .from(coincidencia)
      .where(and(eq(coincidencia.usuarioId, ANA), eq(coincidencia.procesoId, "CO1.REQ.1")));
    expect(filas).toEqual([{ origen: "manual", accountId: ANA }]);
  });

  it("un id que no es un proceso vivo no crea fila", async () => {
    expect(await seguir(ANA, ANA, "CO1.REQ.NOEXISTE")).toBe("no-existe");
    expect(await seguir(ANA, ANA, "CO1.REQ.BORRADO")).toBe("no-existe");
  });

  it("lo que ya seguía por su perfil se queda como estaba", async () => {
    expect(await seguir(ANA, ANA, "CO1.REQ.2")).toBe("ya-lo-seguia");
    const [fila] = await db
      .select({ origen: coincidencia.origen })
      .from(coincidencia)
      .where(and(eq(coincidencia.usuarioId, ANA), eq(coincidencia.procesoId, "CO1.REQ.2")));
    expect(fila.origen).toBeNull();
  });
});

describe("seguidos", () => {
  it("dice qué sigue la cuenta y si fue a mano, también lo del perfil", async () => {
    expect(await seguidos(ANA, ["CO1.REQ.1", "CO1.REQ.2", "CO1.REQ.3"])).toEqual({
      "CO1.REQ.1": { siguiendo: true, manual: true },
      "CO1.REQ.2": { siguiendo: true, manual: false },
    });
  });

  it("otra cuenta no ve lo que sigue Ana", async () => {
    expect(await seguidos(BETO, ["CO1.REQ.1", "CO1.REQ.2"])).toEqual({});
  });
});

describe("dejarDeSeguir", () => {
  it("otra cuenta no puede quitarle nada a Ana", async () => {
    expect(await dejarDeSeguir(BETO, "CO1.REQ.1")).toBe("no-lo-seguia");
    expect((await seguidos(ANA, ["CO1.REQ.1"]))["CO1.REQ.1"]?.siguiendo).toBe(true);
  });

  it("lo del perfil no se borra desde aquí", async () => {
    expect(await dejarDeSeguir(ANA, "CO1.REQ.2")).toBe("no-era-manual");
    expect((await seguidos(ANA, ["CO1.REQ.2"]))["CO1.REQ.2"]?.siguiendo).toBe(true);
  });

  it("lo manual se deja de seguir, y luego no hay nada que dejar", async () => {
    expect(await dejarDeSeguir(ANA, "CO1.REQ.1")).toBe("dejado");
    expect(await seguidos(ANA, ["CO1.REQ.1"])).toEqual({});
    expect(await dejarDeSeguir(ANA, "CO1.REQ.1")).toBe("no-lo-seguia");
  });
});
