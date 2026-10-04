/**
 * El tipo de obra en un filtro guardado, de punta a punta contra PGlite con las
 * migraciones reales (0025 incluida): se guarda, se aplica y lo descartado queda
 * en `al_descartes` con el motivo `tipo_fuera`.
 */
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";

vi.mock("@/src/lib/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/src/lib/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), pool: { end: () => client.close() }, schema };
});

import { db } from "@/src/lib/db/client";
import { alDescartes, alFiltrosUsuario, coincidencia, proceso, usuario } from "@/src/lib/db/schema";
import { crearFiltro, listarFiltros } from "@/src/lib/al/filtros/store";
import { validarFiltro } from "@/src/lib/al/filtros/tipos";
import { correrFiltro } from "@/src/lib/al/matching/correr-filtros";

const U = "u-tipos";

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.insert(usuario).values({ id: U, email: "tipos@example.com" });
  const comun = { estadoApertura: "Abierto", estadoActual: "Abierto", objeto: "Obra de agua" };
  await db.insert(proceso).values([
    { ...comun, secopProcesoId: "CO1.REQ.PTAR", tipoProyecto: "ptar" },
    { ...comun, secopProcesoId: "CO1.REQ.ACUE", tipoProyecto: "acueducto" },
    { ...comun, secopProcesoId: "CO1.REQ.SINTIPO", tipoProyecto: null },
  ]);
});

describe("tipo de obra en un filtro guardado", () => {
  it("se guarda y se lee", async () => {
    const v = validarFiltro({ nombre: "PTAR", tiposProyecto: ["ptar"] });
    await crearFiltro(U, U, v.valor);
    const [f] = await listarFiltros(U);
    expect(f.tiposProyecto).toEqual(["ptar"]);
  });

  it("trae el tipo listado y lo que no tiene tipo; descarta el resto con su motivo", async () => {
    const [fila] = await db
      .select()
      .from(alFiltrosUsuario)
      .where(eq(alFiltrosUsuario.usuarioId, U));
    const r = await correrFiltro(fila);
    expect(r.coincidencias).toBe(2);

    const seguidas = await db
      .select({ id: coincidencia.procesoId })
      .from(coincidencia)
      .where(eq(coincidencia.usuarioId, U));
    expect(seguidas.map((s) => s.id).sort()).toEqual(["CO1.REQ.PTAR", "CO1.REQ.SINTIPO"]);

    const descartes = await db
      .select({ motivo: alDescartes.motivo })
      .from(alDescartes)
      .where(eq(alDescartes.filtroId, fila.id));
    expect(descartes.map((d) => d.motivo)).toContain("tipo_fuera");
  });
});
