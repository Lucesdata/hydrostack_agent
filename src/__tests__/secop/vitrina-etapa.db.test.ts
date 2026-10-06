/**
 * El filtro de etapa de la vitrina (PR 3 del plan 2026-10-05-ficha-viva-ciclo-de-vida)
 * contra un Postgres de verdad (PGlite con las migraciones reales): la
 * subconsulta de contratos, el NIT, las fechas en Colombia y el corte de 2026.
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
import { contrato, proceso, proveedor } from "@/src/lib/db/schema";
import { SIN_FILTROS, type EtapaFiltro } from "@/src/lib/secop/filtros-vitrina";
import { procesosDeVitrina } from "@/src/lib/secop/vitrina";

function dia(offset: number): string {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
}

let nit = 0;
async function unProveedor(tipoDocumento: string | null) {
  const [p] = await db
    .insert(proveedor)
    .values({ nitCanonico: String(900000 + ++nit), tipoDocumento, razonSocial: `PROV ${nit}` })
    .returning({ id: proveedor.id });
  return p.id;
}

let n = 0;
async function unProceso(
  id: string,
  v: {
    publicado?: string;
    estado?: string;
    contrato?: {
      firma?: string | null;
      inicio?: string | null;
      fin?: string | null;
      estado?: string;
      tipoDocumento?: string | null;
    };
  }
) {
  const [p] = await db
    .insert(proceso)
    .values({
      secopProcesoId: id,
      objeto: `Obra ${id}`,
      estadoApertura: "Abierto",
      estadoActual: v.estado ?? "Abierto",
      fechaPublicacion: v.publicado ?? "2026-05-01",
      adjudicatario: "Persona Natural Que No Debe Verse",
    })
    .returning({ id: proceso.id });
  if (v.contrato) {
    const c = v.contrato;
    await db.insert(contrato).values({
      secopContratoId: `CO1.PCCNTR.${++n}`,
      procesoId: p.id,
      proveedorId: await unProveedor(c.tipoDocumento === undefined ? "NIT" : c.tipoDocumento),
      fechaFirma: c.firma === undefined ? "2026-05-10" : c.firma,
      fechaInicio: c.inicio === undefined ? dia(-30) : c.inicio,
      fechaFinInicial: c.fin === undefined ? dia(60) : c.fin,
      fechaFinActual: c.fin === undefined ? dia(60) : c.fin,
      estadoActual: c.estado ?? "En ejecución",
    });
  }
}

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await unProceso("CO1.REQ.EJECUCION", { contrato: {} });
  // Márgenes de días: `dia()` es UTC y «hoy» en la consulta es Colombia (UTC−5).
  await unProceso("CO1.REQ.CUMPLIDO", { contrato: { inicio: dia(-90), fin: dia(-10) } });
  await unProceso("CO1.REQ.CONTRATADO", { contrato: { inicio: dia(10) } });
  await unProceso("CO1.REQ.SININICIO", { contrato: { inicio: null } });
  // No deben aparecer en ninguna etapa:
  await unProceso("CO1.REQ.PERSONA", { contrato: { tipoDocumento: "CC" } });
  await unProceso("CO1.REQ.SINTIPO", { contrato: { tipoDocumento: null } });
  await unProceso("CO1.REQ.2025", { publicado: "2025-12-31", contrato: {} });
  await unProceso("CO1.REQ.BORRADOR", { contrato: { estado: "Borrador" } });
  await unProceso("CO1.REQ.SINFIRMA", { contrato: { firma: null } });
  await unProceso("CO1.REQ.CANCELADO", { estado: "Cancelado", contrato: {} });
  await unProceso("CO1.REQ.SINCONTRATO", {});
});

const ids = async (etapa: EtapaFiltro) =>
  (await procesosDeVitrina("abiertos", 1, { filtros: { ...SIN_FILTROS, etapa } })).items
    .map((i) => i.secopProcesoId)
    .sort();

describe("filtro de etapa de la vitrina", () => {
  it("en ejecución: inicio pasado y fin futuro", async () => {
    expect(await ids("en_ejecucion")).toEqual(["CO1.REQ.EJECUCION"]);
  });

  it("plazo cumplido: el fin del contrato ya pasó", async () => {
    expect(await ids("plazo_cumplido")).toEqual(["CO1.REQ.CUMPLIDO"]);
  });

  it("contratado: inicio futuro o sin fecha de inicio", async () => {
    expect(await ids("contratado")).toEqual(["CO1.REQ.CONTRATADO", "CO1.REQ.SININICIO"]);
  });

  it("la pastilla dice la etapa y no se expone al adjudicatario del proceso", async () => {
    const p = await procesosDeVitrina("abiertos", 1, {
      filtros: { ...SIN_FILTROS, etapa: "en_ejecucion" },
    });
    expect(p.total).toBe(1);
    expect(p.items[0].etapaCalculada).toBe("En ejecución");
    expect(p.items[0].adjudicatario).toBeNull();
  });

  it("apagado por defecto: sin el filtro, nada de esto es una oportunidad abierta", async () => {
    const p = await procesosDeVitrina("abiertos", 1, { filtros: SIN_FILTROS });
    expect(p.total).toBe(0);
  });
});
