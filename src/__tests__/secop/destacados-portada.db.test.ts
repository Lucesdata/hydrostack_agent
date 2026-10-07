/**
 * Los tres destacados del hero contra un Postgres de verdad (PGlite con las
 * migraciones reales): lo que se prueba es SQL —el filtro de abiertos, el de
 * número de proceso, el patrón del id, la familia, `DISTINCT ON` y el orden de
 * la regla— y un mock no ejecuta nada de eso. Mismo patrón que
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
import { entidad, geografia, proceso } from "@/src/lib/db/schema";
import { destacadosPortada } from "@/src/lib/secop/destacados-portada";

let n = 0;
async function unProceso(v: {
  id?: string;
  geo?: string | null;
  abierto?: boolean;
  estadoActual?: string;
  referencia?: string | null;
  objeto?: string | null;
  descripcion?: string | null;
  valor?: string | null;
  entidadId?: string | null;
  tipo?: string | null;
  /** `fecha_recepcion`; por defecto vigente. `null` = no publicada. */
  recepcion?: string | null;
}) {
  n += 1;
  const id = v.id ?? `CO1.REQ.${n}`;
  await db.insert(proceso).values({
    secopProcesoId: id,
    referencia: v.referencia === undefined ? `00${n}-LP-2026` : v.referencia,
    objeto: v.objeto === undefined ? `Obra ${n}` : v.objeto,
    descripcion: v.descripcion ?? null,
    geografiaId: v.geo === undefined ? "76001" : v.geo,
    entidadId: v.entidadId ?? null,
    valorEstimado: v.valor ?? null,
    estadoApertura: v.abierto === false ? "Cerrado" : "Abierto",
    estadoActual: v.estadoActual ?? (v.abierto === false ? "Adjudicado" : "Publicado"),
    tipoProyecto: v.tipo === undefined ? "acueducto" : v.tipo,
    fechaRecepcion: v.recepcion === undefined ? "2099-12-31" : v.recepcion,
  });
  return id;
}

/** Hoy en Colombia: recibe ofertas, pero le quedan menos de cinco días. */
const HOY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

const ids: Record<string, string> = {};

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
      codigoDivipola: "52000",
      departamentoCodigo: "52",
      departamentoNombre: "Nariño",
      municipioCodigo: "000",
    },
    // Un código que el mapa no sabe anclar: sus procesos no son candidatos.
    { codigoDivipola: "99999", departamentoCodigo: "00", departamentoNombre: "Inexistente" },
  ]);
  const [ent] = await db
    .insert(entidad)
    .values({ nitCanonico: "1", nombre: "MUNICIPIO DE CALI" })
    .returning({ id: entidad.id });

  // Agua potable: gana el de mayor presupuesto CON margen, aunque otro sin
  // margen sea mayor.
  ids.potable = await unProceso({
    entidadId: ent.id,
    valor: "2450000000",
    objeto: "Pavimentación",
    descripcion: "Pavimentación y red de acueducto",
  });
  ids.potableSinMargen = await unProceso({ tipo: "ptap", valor: "9000000000", recepcion: HOY });
  await unProceso({ valor: "1000000000" });

  // Agua residual: ninguno tiene margen; gana el mayor y se dice que cierra pronto.
  ids.residual = await unProceso({
    geo: "52000",
    tipo: "ptar",
    valor: "980000000",
    recepcion: HOY,
  });
  await unProceso({ geo: "52000", tipo: "ptar", valor: "400000000", recepcion: HOY });

  // No compiten, cada uno por una razón (todos con presupuesto enorme).
  const enorme = "99000000000";
  await unProceso({ valor: enorme, abierto: false }); // cerrado
  await unProceso({ valor: enorme, estadoActual: "Seleccionado" }); // trámite no abierto
  await unProceso({ valor: enorme, referencia: null }); // sin número de proceso
  await unProceso({ valor: enorme, referencia: "   " });
  await unProceso({ valor: enorme, objeto: "  " }); // sin objeto
  await unProceso({ valor: enorme, geo: null }); // sin ubicación
  await unProceso({ valor: enorme, geo: "99999" }); // ubicación que el mapa no ancla
  await unProceso({ valor: enorme, id: "PROC-123" }); // id que la ficha no resuelve
  await unProceso({ valor: enorme, recepcion: null }); // sin fecha de recepción
  await unProceso({ valor: enorme, recepcion: "2020-01-01" }); // recepción vencida
  await unProceso({ valor: enorme, tipo: null }); // sin subsistema: no tiene pestaña
  await unProceso({ valor: enorme, tipo: "otros" });

  // Redes: los únicos candidatos no compiten.
  await unProceso({ tipo: "alcantarillado", valor: "0" }); // el 0 del SECOP no es presupuesto
  await unProceso({ tipo: "alcantarillado", valor: null });
  await unProceso({ tipo: "alcantarillado", valor: enorme, recepcion: "2020-01-01" });
});

describe("destacadosPortada", () => {
  it("una entrada por pestaña, en su orden", async () => {
    const d = await destacadosPortada();
    expect(d.map((x) => x.familia)).toEqual(["potable", "residual", "redes"]);
  });

  it("potable: el de mayor presupuesto con al menos cinco días, no el mayor a secas", async () => {
    const [potable] = await destacadosPortada();
    expect(potable.proceso?.id).toBe(ids.potable);
    expect(potable.holgado).toBe(true);
    expect(potable.cierre).toBe("2099-12-31");
  });

  it("residual: sin ninguno con margen, el de mayor presupuesto y «cierra pronto»", async () => {
    const [, residual] = await destacadosPortada();
    expect(residual.proceso?.id).toBe(ids.residual);
    expect(residual.holgado).toBe(false);
    expect(residual.cierre).toBe(HOY);
  });

  it("redes: sin candidatos válidos, la pestaña queda vacía (nada inventado)", async () => {
    const [, , redes] = await destacadosPortada();
    expect(redes).toEqual({ familia: "redes", proceso: null, cierre: null, holgado: false });
  });

  it("es estable: la misma base da siempre los mismos destacados", async () => {
    const a = await destacadosPortada();
    const b = await destacadosPortada();
    expect(b).toEqual(a);
  });

  it("mapea número de proceso, entidad, presupuesto y ubicación del registro", async () => {
    const [potable, residual] = await destacadosPortada();
    expect(potable.proceso).toMatchObject({
      numeroProceso: expect.stringMatching(/-LP-2026$/),
      contextoTipo: "Según descripción: Acueducto.",
      entidad: "MUNICIPIO DE CALI",
      presupuesto: 2_450_000_000,
      departamentoCodigo: "76",
      municipio: "Cali",
      abierto: true,
      ubicacion: "entidad",
    });
    expect(residual.proceso).toMatchObject({
      tipoProyecto: "ptar",
      departamento: "Nariño",
      municipio: null,
    });
  });
});
