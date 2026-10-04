/**
 * El panel del Radar contra un Postgres de verdad (PGlite con las migraciones
 * reales): orden de las tarjetas, ids que ya no existen, pliego subido y los
 * datos del bloque de decisión apuntando a la ficha.
 */
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";

vi.mock("@/src/lib/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/src/lib/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), pool: { end: () => client.close() }, schema };
});

import { db } from "@/src/lib/db/client";
import { geografia, pliegoProceso, proceso } from "@/src/lib/db/schema";
import { detallesDeRadar } from "@/src/lib/secop/radar";

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.insert(geografia).values({
    codigoDivipola: "17614",
    departamentoCodigo: "17",
    departamentoNombre: "Caldas",
    municipioCodigo: "614",
    municipioNombre: "Riosucio",
  });
  await db.insert(proceso).values([
    {
      secopProcesoId: "CO1.REQ.1",
      objeto: "ALCANTARILLADO SAN JERONIMO",
      geografiaId: "17614",
      valorEstimado: "180000000",
      estadoApertura: "Abierto",
      estadoActual: "Publicado",
      tipoProyecto: "alcantarillado",
      url: "https://community.secop.gov.co/1",
    },
    {
      secopProcesoId: "CO1.REQ.2",
      objeto: "Planta de tratamiento",
      estadoApertura: "Abierto",
      estadoActual: "Publicado",
      tipoProyecto: null,
      url: "javascript:alert(1)",
    },
  ]);
  await db.insert(pliegoProceso).values({
    procesoId: "CO1.REQ.2",
    nombreArchivo: "pliego.pdf",
    extraction: {},
    validation: {},
    origen: {},
    gateMatematicoPasado: true,
  });
});

describe("detallesDeRadar", () => {
  const tarjetas = [
    { secopProcesoId: "CO1.REQ.2", href: "/licitaciones/planta--CO1.REQ.2" },
    { secopProcesoId: "CO1.REQ.NOEXISTE", href: "/licitaciones/x--CO1.REQ.NOEXISTE" },
    { secopProcesoId: "CO1.REQ.1", href: "/licitaciones/alcantarillado--CO1.REQ.1" },
  ];

  it("respeta el orden de la lista y omite lo que ya no existe", async () => {
    const d = await detallesDeRadar(tarjetas);
    expect(d.map((x) => x.id)).toEqual(["CO1.REQ.2", "CO1.REQ.1"]);
  });

  it("arma la cabecera del panel", async () => {
    const [, uno] = await detallesDeRadar(tarjetas);
    expect(uno).toMatchObject({
      titulo: "Alcantarillado san jeronimo",
      lugar: "Riosucio, Caldas",
      tipoLabel: "Alcantarillado",
      href: "/licitaciones/alcantarillado--CO1.REQ.1",
    });
    expect(uno.tipoColor).toMatch(/^#/);
  });

  it("los datos del bloque de decisión saben del pliego y apuntan a la ficha", async () => {
    const [dos, uno] = await detallesDeRadar(tarjetas);
    expect(dos.datos.conPliego).toBe(true);
    expect(uno.datos.conPliego).toBe(false);
    expect(uno.datos.hrefFicha).toBe("/licitaciones/alcantarillado--CO1.REQ.1");
    expect(uno.datos.presupuesto).toMatch(/180/);
    expect(uno.datos.urlSecop).toBe("https://community.secop.gov.co/1");
  });

  it("una URL del SECOP que no es http(s) no llega al panel", async () => {
    const [dos] = await detallesDeRadar(tarjetas);
    expect(dos.datos.urlSecop).toBeNull();
    expect(dos.tipoLabel).toBeNull();
  });

  it("sin tarjetas no consulta nada", async () => {
    expect(await detallesDeRadar([])).toEqual([]);
  });
});
