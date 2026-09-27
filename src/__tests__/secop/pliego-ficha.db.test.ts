/**
 * El pliego que pinta la §4 de la ficha: el mapeo (lo no declarado sale como
 * `null`, nunca como un valor) y la consulta contra un Postgres de verdad
 * (PGlite con las migraciones reales), mismo patrón que
 * `resumen-departamento.db.test.ts`.
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
import { pliegoProceso } from "@/src/lib/db/schema";
import { pliegoDeProceso, vistaPliegoFicha, type FilaPliego } from "@/src/lib/secop/pliego-ficha";
import { NO_ENCONTRADO, type PliegoExtraction } from "@/src/lib/pliego/schema";

function extraccion(over: Partial<PliegoExtraction> = {}): PliegoExtraction {
  return {
    proceso: "P-1",
    entidad: "E",
    objeto_contrato: NO_ENCONTRADO,
    modalidad_contratacion: NO_ENCONTRADO,
    fecha_publicacion: NO_ENCONTRADO,
    fecha_cierre: "2026-10-15",
    presupuesto_oficial_cop: 850_000_000,
    moneda: "COP",
    capitulos: [
      {
        nombre: "Preliminares",
        items: [
          {
            codigo: "1.1",
            descripcion: "Localización",
            unidad: "M2",
            cantidad: 10,
            valor_unitario: 1000,
            valor_total: 10_000,
            cita_textual: "c",
          },
          {
            codigo: "1.2",
            descripcion: "Descapote",
            unidad: "M3",
            cantidad: 2,
            valor_unitario: 5000,
            valor_total: 10_000,
            cita_textual: "c",
          },
        ],
      },
    ],
    reglas_presupuesto: ["Se rechaza la oferta que supere el presupuesto oficial.", NO_ENCONTRADO],
    requisitos_habilitantes: {
      experiencia_especifica: "Dos contratos de acueducto",
      capacidad_financiera: NO_ENCONTRADO,
      capacidad_organizacional: "  ",
    },
    cronograma: [
      { hito: "Cierre", fecha: "2026-10-15", cita_textual: "c" },
      { hito: "Audiencia", fecha: NO_ENCONTRADO, cita_textual: "c" },
      { hito: NO_ENCONTRADO, fecha: "2026-10-01", cita_textual: "c" },
    ],
    verificacion: {
      campos_no_encontrados: [],
      confianza_general: "media",
      justificacion_confianza: "ok",
    },
    lagunas_pendientes: [
      { id: 1, descripcion: "Anexo técnico no incluido", severidad: "alta", tipo: "x" },
    ],
    ...over,
  };
}

const ORIGEN: FilaPliego["origen"] = {
  reglas_presupuesto: "reglas",
  requisitos_habilitantes: "reglas",
  capitulos: "llm",
};

describe("vistaPliegoFicha", () => {
  const fila = (x = extraccion()): FilaPliego => ({
    nombreArchivo: "pliego.pdf",
    updatedAt: new Date("2026-09-27T10:00:00Z"),
    gateMatematicoPasado: true,
    extraction: x,
    origen: ORIGEN,
  });

  it("lo que el pliego no declara sale como null, nunca como el literal", () => {
    const v = vistaPliegoFicha(fila());
    expect(v.requisitos.map((r) => r.texto)).toEqual(["Dos contratos de acueducto", null, null]);
    expect(v.causales).toEqual(["Se rechaza la oferta que supere el presupuesto oficial."]);
    expect(v.cronograma).toEqual([
      { hito: "Cierre", fecha: "2026-10-15" },
      { hito: "Audiencia", fecha: null },
    ]);
    expect(JSON.stringify(v)).not.toContain(NO_ENCONTRADO);
  });

  it("un presupuesto en cero no es un presupuesto", () => {
    expect(
      vistaPliegoFicha(fila(extraccion({ presupuesto_oficial_cop: 0 }))).presupuestoOficialCop
    ).toBeNull();
    expect(vistaPliegoFicha(fila()).presupuestoOficialCop).toBe(850_000_000);
  });

  it("resume cada capítulo en ítems y total, y conserva el origen de cada bloque", () => {
    const v = vistaPliegoFicha(fila());
    expect(v.capitulos).toEqual([{ nombre: "Preliminares", items: 2, total: 20_000 }]);
    expect(v.origen).toEqual({ requisitos: "reglas", causales: "reglas", capitulos: "llm" });
    expect(v.confianza).toBe("media");
    expect(v.lagunas).toEqual([{ descripcion: "Anexo técnico no incluido", severidad: "alta" }]);
  });
});

describe("pliegoDeProceso (SQL real)", () => {
  beforeAll(async () => {
    await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
    await db.insert(pliegoProceso).values({
      procesoId: "CO1.REQ.42",
      nombreArchivo: "documento-base.pdf",
      extraction: extraccion(),
      validation: { ok: true, inconsistencias: [], notas: [] },
      origen: ORIGEN,
      gateMatematicoPasado: true,
    });
  });

  it("devuelve la vista del pliego del proceso", async () => {
    const v = await pliegoDeProceso("CO1.REQ.42");
    expect(v?.nombreArchivo).toBe("documento-base.pdf");
    expect(v?.consistente).toBe(true);
    expect(v?.requisitos[0].texto).toBe("Dos contratos de acueducto");
  });

  it("sin pliego subido devuelve null", async () => {
    expect(await pliegoDeProceso("CO1.REQ.999")).toBeNull();
  });
});
