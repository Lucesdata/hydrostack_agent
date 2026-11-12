/**
 * La consulta del marketplace contra un Postgres de verdad (PGlite con las
 * migraciones reales): lo que se prueba es SQL —el predicado compartido con la
 * vitrina, el agrupado sin el filtro territorial, los distintos y las sumas— y
 * un mock no ejecuta nada de eso. Cubre A03 (KPIs reproducibles, sin
 * duplicados, 0/null distintos) y la paridad con la vitrina (SPEC §4).
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
import { entidad, geografia, proceso } from "@/src/lib/db/schema";
import { consultarMarketplace } from "@/src/lib/marketplace/consulta";
import { SIN_FILTROS } from "@/src/lib/secop/filtros-vitrina";
import { procesosDeVitrina } from "@/src/lib/secop/vitrina";

const SECOP =
  "https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.900&isFromPublicArea=True";
let n = 0;
const ids = { alcaldia: "", empresa: "" };

async function unProceso(v: {
  geo?: string | null;
  tipo?: string | null;
  valor?: string | null;
  entidad?: string;
  abierto?: boolean;
  borrado?: boolean;
  referencia?: string;
  objeto?: string;
  url?: string | null;
}) {
  n += 1;
  const abierto = v.abierto ?? true;
  await db.insert(proceso).values({
    secopProcesoId: `CO1.REQ.${1000 + n}`,
    referencia: v.referencia ?? `REF-${n}`,
    objeto: v.objeto ?? `Obra de agua ${n}`,
    entidadId: v.entidad ?? ids.alcaldia,
    geografiaId: v.geo === undefined ? "76001" : v.geo,
    tipoProyecto: v.tipo === undefined ? "acueducto" : v.tipo,
    valorEstimado: v.valor === undefined ? "1000000000" : v.valor,
    fechaPublicacion: "2026-11-01",
    estadoApertura: abierto ? "Abierto" : "Cerrado",
    estadoActual: abierto ? "Publicado" : "Adjudicado",
    fechaRecepcion: abierto ? "2099-12-31" : "2026-11-02",
    url: v.url === undefined ? null : v.url,
    deletedAt: v.borrado ? new Date() : null,
  });
}

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.insert(geografia).values([
    {
      codigoDivipola: "76001",
      departamentoCodigo: "76",
      departamentoNombre: "Valle del Cauca",
      municipioCodigo: "001",
      municipioNombre: "Cali",
    },
    {
      codigoDivipola: "76109",
      departamentoCodigo: "76",
      departamentoNombre: "Valle del Cauca",
      municipioCodigo: "109",
      municipioNombre: "Buenaventura",
    },
    {
      codigoDivipola: "52001",
      departamentoCodigo: "52",
      departamentoNombre: "Nariño",
      municipioCodigo: "001",
      municipioNombre: "Pasto",
    },
  ]);
  const [a, e] = await db
    .insert(entidad)
    .values([
      { nitCanonico: "111", nombre: "Alcaldía de Cali" },
      { nitCanonico: "222", nombre: "Empresa de Acueducto" },
    ])
    .returning({ id: entidad.id });
  ids.alcaldia = a.id;
  ids.empresa = e.id;

  // Valle: 3 abiertos (2 entidades; precios 1.000 M, 500 M y uno sin precio).
  await unProceso({ referencia: "LP-001", url: SECOP, objeto: "Optimización de la PTAP" });
  await unProceso({ geo: "76109", entidad: ids.empresa, valor: "500000000", tipo: "ptar" });
  await unProceso({ valor: "0", tipo: "alcantarillado" }); // el 0 es un hueco
  // Nariño: 1 abierto.
  await unProceso({ geo: "52001", valor: "250000000", tipo: "ptap" });
  // Sin ubicación y sin tipo.
  await unProceso({ geo: null, valor: null, tipo: null });
  // No cuentan.
  await unProceso({ borrado: true });
  await unProceso({ abierto: false, referencia: "CERRADO-9", objeto: "Proceso cerrado de prueba" });
});

describe("consultarMarketplace", () => {
  it("total, lista e indicadores cuadran y no duplican (A03)", async () => {
    const c = await consultarMarketplace(SIN_FILTROS);
    if (c.estado === "no-disponible") throw new Error("la base no respondió");
    expect(c.total).toBe(5);
    expect(c.items).toHaveLength(5);
    expect(c.metricas).toMatchObject({
      abiertas: 5,
      entidades: 2, // las dos entidades, una sola vez cada una
      procesosConValor: 3, // 0 y NULL no son precio
    });
    expect(Number(c.metricas!.valorEstimadoCop)).toBe(1_750_000_000);
  });

  it("paridad con la vitrina para los mismos filtros", async () => {
    for (const filtros of [
      SIN_FILTROS,
      { ...SIN_FILTROS, tipo: "potable" as const },
      { ...SIN_FILTROS, q: "Cali" },
      { ...SIN_FILTROS, presupuestoMin: 100 as const },
    ]) {
      const m = await consultarMarketplace(filtros);
      const v = await procesosDeVitrina("abiertos", 1, { filtros });
      if (m.estado === "no-disponible") throw new Error("la base no respondió");
      expect(m.total).toBe(v.total);
      expect(m.items.map((o) => o.id)).toEqual(v.items.map((p) => p.secopProcesoId));
    }
  });

  it("el departamento filtra lista e indicadores, pero no el mapa", async () => {
    const c = await consultarMarketplace({ ...SIN_FILTROS, departamento: "narino" });
    if (c.estado === "no-disponible") throw new Error("la base no respondió");
    expect(c.departamentoSeleccionado).toMatchObject({ codigo: "52", nombre: "Nariño" });
    expect(c.total).toBe(1);
    expect(c.metricas?.abiertas).toBe(1);
    // El mapa sigue ofreciendo los demás departamentos para poder cambiar.
    expect(c.porDepartamento.map((r) => [r.codigo, r.total])).toEqual([
      ["76", 3],
      ["52", 1],
    ]);
    expect(c.sinUbicacion).toBe(1);
  });

  it("una región válida sin coincidencias conserva la selección y muestra cero", async () => {
    const c = await consultarMarketplace({
      ...SIN_FILTROS,
      departamento: "narino",
      tipo: "residual",
    });
    if (c.estado === "no-disponible") throw new Error("la base no respondió");
    expect(c.departamentoSeleccionado?.codigo).toBe("52");
    expect(c.total).toBe(0);
    expect(c.items).toEqual([]);
    expect(c.metricas?.abiertas).toBe(0);
    expect(c.departamentoInvalido).toBe(false);
  });

  it("un departamento válido que no existe en la base (Chocó) tampoco da error", async () => {
    const c = await consultarMarketplace({ ...SIN_FILTROS, departamento: "choco" });
    if (c.estado === "no-disponible") throw new Error("la base no respondió");
    expect(c.departamentoSeleccionado?.codigo).toBe("27");
    expect(c.total).toBe(0);
  });

  it("un slug desconocido es un filtro inválido explícito y no filtra", async () => {
    const c = await consultarMarketplace({ ...SIN_FILTROS, departamento: "atlantida" });
    if (c.estado === "no-disponible") throw new Error("la base no respondió");
    expect(c.departamentoInvalido).toBe(true);
    expect(c.departamentoSeleccionado).toBeNull();
    expect(c.total).toBe(5);
  });

  it("los filtros de texto y tipo también recortan el mapa", async () => {
    const c = await consultarMarketplace({ ...SIN_FILTROS, tipo: "potable" });
    if (c.estado === "no-disponible") throw new Error("la base no respondió");
    // potable = acueducto + PTAP: el mapa suma lo mismo que la lista (más lo sin ubicación).
    expect(c.total).toBe(2);
    expect(c.porDepartamento.reduce((s, r) => s + r.total, 0) + c.sinUbicacion).toBe(c.total);
  });

  it("la búsqueda por número encuentra cerrados, rotulados, y retira los indicadores", async () => {
    const c = await consultarMarketplace({ ...SIN_FILTROS, numero: "CERRADO-9" });
    if (c.estado === "no-disponible") throw new Error("la base no respondió");
    expect(c.metricas).toBeNull();
    expect(c.total).toBe(1);
    expect(c.items[0].referencia).toBe("CERRADO-9");
    expect(c.items[0].etapaCalculada).not.toBeNull();
  });

  it("la tarjeta trae referencia, departamento y un enlace SECOP validado", async () => {
    const c = await consultarMarketplace({ ...SIN_FILTROS, q: "Optimización de la PTAP" });
    if (c.estado === "no-disponible") throw new Error("la base no respondió");
    const o = c.items[0];
    expect(o.referencia).toBe("LP-001");
    expect(o.departamentoCodigo).toBe("76");
    expect(o.secopHref).toBe(SECOP);
    expect(o.fichaHref).toMatch(/^\/licitaciones\//);
  });

  it("marca la frescura con la última actualización de la ingesta", async () => {
    const c = await consultarMarketplace(SIN_FILTROS);
    if (c.estado === "no-disponible") throw new Error("la base no respondió");
    expect(c.actualizadoEn).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(c.estado).toBe("disponible");
  });

  it("ignora el filtro de etapa: no son oportunidades", async () => {
    const a = await consultarMarketplace(SIN_FILTROS);
    const b = await consultarMarketplace({ ...SIN_FILTROS, etapa: "en_ejecucion" });
    if (a.estado === "no-disponible" || b.estado === "no-disponible")
      throw new Error("la base no respondió");
    expect(b.total).toBe(a.total);
  });
});
