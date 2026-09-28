/**
 * La cuota de pliegos contra un Postgres de verdad (PGlite con las migraciones
 * reales): ventana de 24 h, tope de 5, la reserva sobrante se borra y cada
 * cuenta lleva su propia cuenta. Mismo patrón que
 * `secop/resumen-departamento.db.test.ts`.
 */
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";

vi.mock("@/src/lib/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/src/lib/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), pool: { end: () => client.close() }, schema };
});

import { db } from "@/src/lib/db/client";
import { senalUsuario, usuario } from "@/src/lib/db/schema";
import {
  CUOTA_PLIEGOS,
  SENAL_USO_EXTRACTOR,
  mensajeCuotaAgotada,
  reservarExtraccion,
} from "@/src/lib/pliego/cuota";

const T0 = new Date("2026-09-27T12:00:00Z");
const horas = (h: number) => new Date(T0.getTime() + h * 3_600_000);

const reservasDe = async (usuarioId: string) =>
  db
    .select({ id: senalUsuario.id })
    .from(senalUsuario)
    .where(and(eq(senalUsuario.usuarioId, usuarioId), eq(senalUsuario.senal, SENAL_USO_EXTRACTOR)));

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.insert(usuario).values([
    { id: "u1", email: "u1@x.co" },
    { id: "u2", email: "u2@x.co" },
  ]);
});

describe("reservarExtraccion", () => {
  it("deja pasar cinco en 24 h y rechaza la sexta sin dejar su reserva", async () => {
    for (let i = 0; i < CUOTA_PLIEGOS; i++) {
      const r = await reservarExtraccion("u1", horas(i));
      expect(r).toEqual({ ok: true, restantes: CUOTA_PLIEGOS - 1 - i });
    }

    const sexta = await reservarExtraccion("u1", horas(6));
    expect(sexta.ok).toBe(false);
    // Se libera cuando la primera (T0) cumple 24 h.
    if (sexta.ok === false) expect(sexta.disponibleDesde).toEqual(horas(24));
    expect(await reservasDe("u1")).toHaveLength(CUOTA_PLIEGOS);
  });

  it("cada cuenta tiene su propia cuota", async () => {
    expect((await reservarExtraccion("u2", horas(6))).ok).toBe(true);
  });

  it("la ventana es móvil: pasadas 24 h de la primera, vuelve a haber hueco", async () => {
    const r = await reservarExtraccion("u1", horas(24.5));
    expect(r).toEqual({ ok: true, restantes: 0 });
  });

  it("el mensaje dice el tope y cuándo se libera, en hora de Colombia", () => {
    const texto = mensajeCuotaAgotada({
      ok: false,
      limite: 5,
      disponibleDesde: new Date("2026-09-28T14:15:00Z"),
    });
    expect(texto).toContain("límite de 5 pliegos en 24 horas");
    expect(texto).toContain("28 de septiembre");
    expect(texto).toContain("09:15");
  });
});
