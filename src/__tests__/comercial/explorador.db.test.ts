/**
 * CI-11c — el explorador de oportunidades contra un Postgres real (PGlite con las
 * migraciones reales). Lo que se prueba es SQL: el universo de cada etapa, los
 * filtros, el prefiltro de tecnología sin tildes y el recorte por negación.
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
import { buscarOportunidades } from "@/src/lib/comercial/explorador";
import {
  parametrosDesdeUrl,
  type ParametrosExplorador,
} from "@/src/lib/comercial/explorador-params";

const P = (extra: Partial<ParametrosExplorador> = {}): ParametrosExplorador => ({
  ...parametrosDesdeUrl({}),
  ...extra,
});

let ent1: string;
let ent2: string;
let nit: string;
let cc: string;
let procAlc: string;

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.insert(geografia).values([
    {
      codigoDivipola: "76895",
      departamentoCodigo: "76",
      departamentoNombre: "Valle del Cauca",
      municipioCodigo: "895",
      municipioNombre: "Zarzal",
    },
    {
      codigoDivipola: "05001",
      departamentoCodigo: "05",
      departamentoNombre: "Antioquia",
      municipioCodigo: "001",
      municipioNombre: "Medellín",
    },
  ]);
  [{ id: ent1 }] = await db
    .insert(entidad)
    .values({ nitCanonico: "800000001", nombre: "Entidad Valle", geografiaId: "76895" })
    .returning({ id: entidad.id });
  [{ id: ent2 }] = await db
    .insert(entidad)
    .values({ nitCanonico: "800000002", nombre: "Entidad Antioquia", geografiaId: "05001" })
    .returning({ id: entidad.id });
  [{ id: nit }] = await db
    .insert(proveedor)
    .values({
      nitCanonico: "900000001",
      nitDv: "0",
      tipoDocumento: "NIT",
      razonSocial: "Consorcio A",
    })
    .returning({ id: proveedor.id });
  [{ id: cc }] = await db
    .insert(proveedor)
    .values({ nitCanonico: "1000000001", tipoDocumento: "CC", razonSocial: "Persona Natural" })
    .returning({ id: proveedor.id });

  const abierto = {
    estadoApertura: "Abierto",
    estadoActual: "Publicado",
    fechaRecepcion: "2099-01-01",
  };
  await db.insert(proceso).values([
    {
      secopProcesoId: "CO1.REQ.1",
      objeto: "Suministro de bombas sumergibles",
      tipoProyecto: "ptar",
      geografiaId: "76895",
      entidadId: ent1,
      valorEstimado: "500.00",
      ...abierto,
    },
    {
      secopProcesoId: "CO1.REQ.2",
      objeto: "El contrato no incluye el suministro de bombas sumergibles",
      tipoProyecto: "ptar",
      geografiaId: "05001",
      entidadId: ent2,
      ...abierto,
    },
    {
      secopProcesoId: "CO1.REQ.3",
      objeto: "Obra de alcantarillado en el casco urbano",
      tipoProyecto: "alcantarillado",
      geografiaId: "05001",
      entidadId: ent2,
      ...abierto,
    },
    {
      secopProcesoId: "CO1.REQ.4",
      objeto: "Suministro de bombas sumergibles (cerrado)",
      tipoProyecto: "ptar",
      geografiaId: "76895",
      entidadId: ent1,
      estadoApertura: "Cerrado",
      estadoActual: "Adjudicado",
      fechaRecepcion: "2099-01-01",
    },
    {
      secopProcesoId: "CO1.REQ.5",
      objeto: "Suministro de bombas sumergibles (borrado)",
      tipoProyecto: "ptar",
      geografiaId: "76895",
      entidadId: ent1,
      deletedAt: new Date(),
      ...abierto,
    },
    {
      secopProcesoId: "CO1.REQ.6",
      objeto: "SUMINISTRO DE ELECTROBOMBA para la estación",
      descripcion: "Estación de bombeo",
      tipoProyecto: "acueducto",
      geografiaId: "76895",
      entidadId: ent1,
      ...abierto,
    },
  ]);
  [{ id: procAlc }] = await db
    .select({ id: proceso.id })
    .from(proceso)
    .where((await import("drizzle-orm")).eq(proceso.secopProcesoId, "CO1.REQ.3"));

  const ejec = {
    fechaFirma: "2026-01-05",
    fechaInicio: "2026-01-10",
    fechaFinActual: "2099-12-31",
    estadoActual: "En ejecución",
  };
  await db.insert(contrato).values([
    {
      secopContratoId: "CO1.PCCNTR.1",
      objeto: "Instalación de variador de frecuencia",
      proveedorId: nit,
      entidadId: ent1,
      procesoId: procAlc,
      valorActual: "900.00",
      ...ejec,
    },
    {
      secopContratoId: "CO1.PCCNTR.2",
      objeto: "Instalación de variador de frecuencia (persona natural)",
      proveedorId: cc,
      entidadId: ent1,
      ...ejec,
    },
    {
      secopContratoId: "CO1.PCCNTR.3",
      objeto: "Variador de frecuencia (plazo cumplido)",
      proveedorId: nit,
      entidadId: ent1,
      ...ejec,
      fechaFinActual: "2026-01-20",
    },
    {
      secopContratoId: "CO1.PCCNTR.4",
      objeto: "Variador de frecuencia (firmado en 2025)",
      proveedorId: nit,
      entidadId: ent1,
      ...ejec,
      fechaFirma: "2025-01-05",
    },
    {
      secopContratoId: "CO1.PCCNTR.5",
      objeto: "Variador de frecuencia (borrador)",
      proveedorId: nit,
      entidadId: ent1,
      ...ejec,
      estadoActual: "Borrador",
    },
    {
      secopContratoId: "CO1.PCCNTR.6",
      objeto: "Obra civil sin equipos",
      proveedorId: nit,
      entidadId: ent2,
      ...ejec,
    },
    {
      secopContratoId: "CO1.PCCNTR.7",
      objeto: "Variador de frecuencia (borrado)",
      proveedorId: nit,
      entidadId: ent1,
      ...ejec,
      deletedAt: new Date(),
    },
  ]);
}, 60_000);

const ids = (r: Awaited<ReturnType<typeof buscarOportunidades>>) => r.filas.map((f) => f.id).sort();

describe("convocatorias", () => {
  it("solo procesos abiertos y no borrados", async () => {
    const r = await buscarOportunidades(P());
    expect(ids(r)).toEqual(["CO1.REQ.1", "CO1.REQ.2", "CO1.REQ.3", "CO1.REQ.6"]);
    expect(r.total).toBe(4);
  });

  it("trae entidad, sede, tipo, valor y el enlace a la ficha existente", async () => {
    const r = await buscarOportunidades(P());
    const f = r.filas.find((x) => x.id === "CO1.REQ.1");
    expect(f).toMatchObject({
      tipo: "convocatoria",
      entidad: "Entidad Valle",
      sede: "Zarzal, Valle del Cauca",
      tipoProyecto: "ptar",
      valor: 500,
    });
    expect(f?.href).toMatch(/^\/licitaciones\/.+--CO1\.REQ\.1$/);
  });

  it("filtro de tecnología: coincide por texto sin tildes y mayúsculas, y descarta la negación", async () => {
    const r = await buscarOportunidades(P({ tecnologia: "BOM.SUM" }));
    expect(ids(r)).toEqual(["CO1.REQ.1"]); // REQ.2 coincide por texto pero está negado
    expect(r.descartadasPorContexto).toBe(1);
    expect(r.filas[0].tecnologias.map((t) => t.codigo)).toContain("BOM.SUM");
    expect(r.filas[0].tecnologias[0].cita.toLowerCase()).toBe("bombas sumergibles");
  });

  it("con filtro de tecnología el total sale de una sola pasada y cuenta las coincidencias de texto", async () => {
    const r = await buscarOportunidades(P({ tecnologia: "BOM.SUM" }));
    expect(r.total).toBe(2); // REQ.1 y REQ.2 (esta última se oculta después por negación)
    // Una página fuera de rango no trae filas pero el total no se pierde.
    const fuera = await buscarOportunidades(P({ tecnologia: "BOM.SUM", pagina: 2 }));
    expect(fuera.filas).toEqual([]);
    expect(fuera.total).toBe(2);
  });

  it("una búsqueda sin ninguna coincidencia da total 0 sin fallar", async () => {
    const r = await buscarOportunidades(P({ tecnologia: "MEM" }));
    expect(r).toMatchObject({ total: 0, filas: [], descartadasPorContexto: 0 });
  });

  it("una categoría raíz incluye a las hijas y a su propio vocabulario", async () => {
    const r = await buscarOportunidades(P({ tecnologia: "BOM" }));
    expect(ids(r)).toEqual(["CO1.REQ.1", "CO1.REQ.6"]); // sumergibles (hija) y electrobomba (raíz, en mayúsculas)
  });

  it("filtros por departamento y por tipo (incluye familias)", async () => {
    expect(ids(await buscarOportunidades(P({ departamento: "05" })))).toEqual([
      "CO1.REQ.2",
      "CO1.REQ.3",
    ]);
    expect(ids(await buscarOportunidades(P({ tipo: "ptar" })))).toEqual(["CO1.REQ.1", "CO1.REQ.2"]);
    expect(ids(await buscarOportunidades(P({ tipo: "potable" })))).toEqual(["CO1.REQ.6"]);
    expect(ids(await buscarOportunidades(P({ tipo: "redes", departamento: "05" })))).toEqual([
      "CO1.REQ.3",
    ]);
  });

  it("pagina sin saltarse ni repetir, y el total no depende de la página", async () => {
    const todos = await buscarOportunidades(P());
    expect(todos.porPagina).toBe(20);
    const vacia = await buscarOportunidades(P({ pagina: 2 }));
    expect(vacia.filas).toEqual([]);
    expect(vacia.total).toBe(4);
  });
});

describe("contratos en ejecución", () => {
  it("solo firmados desde 2026, vigentes por fechas, no borradores ni borrados, con contratista NIT", async () => {
    const r = await buscarOportunidades(P({ etapa: "ejecucion" }));
    expect(ids(r)).toEqual(["CO1.PCCNTR.1", "CO1.PCCNTR.6"]);
  });

  it("nunca incluye a una persona natural ni expone su nombre", async () => {
    const r = await buscarOportunidades(P({ etapa: "ejecucion" }));
    expect(JSON.stringify(r)).not.toContain("Persona Natural");
    const f = r.filas.find((x) => x.id === "CO1.PCCNTR.1");
    expect(f).toMatchObject({
      tipo: "contrato",
      contratista: "Consorcio A",
      entidad: "Entidad Valle",
      href: "/comercial/contratos/CO1.PCCNTR.1",
    });
  });

  it("filtra por tecnología sobre el objeto del contrato", async () => {
    const r = await buscarOportunidades(P({ etapa: "ejecucion", tecnologia: "AUT" }));
    expect(ids(r)).toEqual(["CO1.PCCNTR.1"]);
    expect(r.filas[0].tecnologias.map((t) => t.codigo)).toContain("AUT");
  });

  it("filtra por departamento (sede de la entidad) y por tipo del proceso", async () => {
    expect(ids(await buscarOportunidades(P({ etapa: "ejecucion", departamento: "05" })))).toEqual([
      "CO1.PCCNTR.6",
    ]);
    expect(
      ids(await buscarOportunidades(P({ etapa: "ejecucion", tipo: "alcantarillado" })))
    ).toEqual(["CO1.PCCNTR.1"]);
  });
});
