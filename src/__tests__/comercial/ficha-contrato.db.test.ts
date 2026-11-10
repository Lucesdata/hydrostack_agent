/**
 * CI-11a — la lectura de la ficha comercial contra un Postgres real (PGlite con
 * las migraciones de `drizzle/`). Lo que se prueba es SQL: los joins, el
 * soft-delete y que no se filtre nada de `raw_attrs`.
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
import { contrato, entidad, geografia, proceso, proveedor } from "@/src/lib/db/schema";
import { fichaComercialDeContrato } from "@/src/lib/comercial/ficha-contrato";

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.insert(geografia).values({
    codigoDivipola: "76895",
    departamentoCodigo: "76",
    departamentoNombre: "Valle del Cauca",
    municipioCodigo: "895",
    municipioNombre: "Zarzal",
  });
}, 60_000);

async function sembrar(
  id: string,
  opts: { tipoDoc?: string; deleted?: boolean; nit?: string } = {}
) {
  const [ent] = await db
    .insert(entidad)
    .values({
      nitCanonico: `8${id.slice(-8)}`,
      nombre: "Municipio de Ejemplo",
      geografiaId: "76895",
    })
    .returning({ id: entidad.id });
  const [prov] = await db
    .insert(proveedor)
    .values({
      nitCanonico: opts.nit ?? `9${id.slice(-8)}`,
      nitDv: "3",
      tipoDocumento: opts.tipoDoc ?? "NIT",
      razonSocial: "Consorcio Ficticio 1",
      esEstructuraPlural: true,
      rawAttrs: { representante_legal: "Persona Privada Secreta" },
    })
    .returning({ id: proveedor.id });
  const [pro] = await db
    .insert(proceso)
    .values({ secopProcesoId: `CO1.REQ.${id.slice(-4)}`, tipoProyecto: "ptar" })
    .returning({ id: proceso.id });
  await db.insert(contrato).values({
    secopContratoId: id,
    objeto: "Suministro de bombas sumergibles",
    entidadId: ent.id,
    proveedorId: prov.id,
    procesoId: pro.id,
    valorActual: "1500.00",
    fechaFinActual: "2099-12-31",
    estadoActual: "En ejecución",
    deletedAt: opts.deleted ? new Date() : null,
  });
}

describe("fichaComercialDeContrato", () => {
  it("lee contrato, entidad, ubicación, tipo y contratista NIT, e infiere la necesidad", async () => {
    await sembrar("CO1.PCCNTR.10000001");
    const f = await fichaComercialDeContrato("CO1.PCCNTR.10000001", "2026-06-01");
    expect(f).toMatchObject({
      id: "CO1.PCCNTR.10000001",
      entidad: "Municipio de Ejemplo",
      ubicacionEntidad: "Zarzal, Valle del Cauca",
      tipoProyecto: "ptar",
      vigente: true,
      valorActual: 1500,
    });
    expect(f?.contratista).toMatchObject({
      visible: true,
      nombre: "Consorcio Ficticio 1",
      nit: "910000001-3",
    });
    expect(f?.necesidades.map((n) => n.codigo)).toContain("BOM.SUM");
  });

  it("no filtra el representante legal que guarda raw_attrs", async () => {
    await sembrar("CO1.PCCNTR.10000002");
    const f = await fichaComercialDeContrato("CO1.PCCNTR.10000002");
    expect(JSON.stringify(f)).not.toContain("Secreta");
  });

  it("persona natural: no se nombra", async () => {
    await sembrar("CO1.PCCNTR.10000003", { tipoDoc: "CC", nit: "7001" });
    const f = await fichaComercialDeContrato("CO1.PCCNTR.10000003");
    expect(f?.contratista.visible).toBe(false);
    expect(JSON.stringify(f)).not.toContain("Consorcio Ficticio");
  });

  it("contrato inexistente, borrado o con id inválido: null", async () => {
    await sembrar("CO1.PCCNTR.10000004", { deleted: true });
    expect(await fichaComercialDeContrato("CO1.PCCNTR.10000004")).toBeNull();
    expect(await fichaComercialDeContrato("CO1.PCCNTR.99999999")).toBeNull();
    expect(await fichaComercialDeContrato("x'; drop table contrato; --")).toBeNull();
  });
});
