/**
 * La selección del hero contra un Postgres de verdad (PGlite con las
 * migraciones reales): lo que se prueba es SQL —el filtro de abiertos, el de
 * número de proceso, el patrón del id, `ORDER BY random()`— y un mock no
 * ejecuta nada de eso. Mismo patrón que `resumen-departamento.db.test.ts`.
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
import { muestraPortada } from "@/src/lib/secop/muestra-portada";

let n = 0;
async function unProceso(v: {
  id?: string;
  geo?: string | null;
  abierto?: boolean;
  estadoActual?: string;
  referencia?: string | null;
  objeto?: string | null;
  valor?: string | null;
  entidadId?: string | null;
  tipo?: string | null;
}) {
  n += 1;
  const id = v.id ?? `CO1.REQ.${n}`;
  await db.insert(proceso).values({
    secopProcesoId: id,
    referencia: v.referencia === undefined ? `00${n}-LP-2026` : v.referencia,
    objeto: v.objeto === undefined ? `Obra ${n}` : v.objeto,
    geografiaId: v.geo === undefined ? "76001" : v.geo,
    entidadId: v.entidadId ?? null,
    valorEstimado: v.valor ?? null,
    estadoApertura: v.abierto === false ? "Cerrado" : "Abierto",
    estadoActual: v.estadoActual ?? (v.abierto === false ? "Adjudicado" : "Publicado"),
    tipoProyecto: v.tipo === undefined ? "acueducto" : v.tipo,
  });
  return id;
}

const validos: string[] = [];

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
      codigoDivipola: "11001",
      departamentoCodigo: "11",
      departamentoNombre: "Bogotá D.C.",
      municipioCodigo: "001",
      municipioNombre: "Bogotá D.C.",
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

  // Elegibles: valle (con municipio), Bogotá, Nariño (solo departamento), uno
  // sin presupuesto y uno sin tipo. Cinco y uno más para que haya sorteo.
  validos.push(await unProceso({ entidadId: ent.id, valor: "2450000000" }));
  validos.push(await unProceso({ geo: "11001", valor: "0", tipo: "alcantarillado" }));
  validos.push(await unProceso({ geo: "52000", tipo: "ptar", valor: "980000000" }));
  validos.push(await unProceso({ valor: null, tipo: null }));
  validos.push(await unProceso({ estadoActual: "Abierto", referencia: "0007-ABC" }));
  validos.push(await unProceso({}));

  // No elegibles, cada uno por una razón.
  await unProceso({ abierto: false }); // cerrado
  await unProceso({ estadoActual: "Seleccionado" }); // apertura «Abierto», trámite no
  await unProceso({ referencia: null }); // sin número de proceso
  await unProceso({ referencia: "   " });
  await unProceso({ objeto: "  " }); // sin objeto
  await unProceso({ geo: null }); // sin ubicación
  await unProceso({ geo: "99999" }); // ubicación que el mapa no ancla
  await unProceso({ id: "PROC-123" }); // id que la ficha no resuelve
});

describe("muestraPortada", () => {
  it("cinco procesos distintos, todos del conjunto elegible", async () => {
    const m = await muestraPortada();
    expect(m).toHaveLength(5);
    expect(new Set(m.map((p) => p.id)).size).toBe(5);
    for (const p of m) expect(validos, p.id).toContain(p.id);
  });

  it("con todos los elegibles, aparecen todos y ningún otro", async () => {
    const m = await muestraPortada(50);
    expect(m.map((p) => p.id).sort()).toEqual([...validos].sort());
  });

  it("es aleatoria: el orden y la elección cambian entre llamadas", async () => {
    const vistas = new Set<string>();
    for (let i = 0; i < 25; i++) vistas.add((await muestraPortada(2)).map((p) => p.id).join());
    expect(vistas.size).toBeGreaterThan(1);
  });

  it("menos candidatos que cinco: devuelve los que hay, sin duplicar", async () => {
    const m = await muestraPortada(3);
    expect(m).toHaveLength(3);
    expect(new Set(m.map((p) => p.id)).size).toBe(3);
  });

  it("mapea número de proceso, entidad, presupuesto y ubicación del registro", async () => {
    const m = await muestraPortada(50);
    const cali = m.find((p) => p.id === validos[0])!;
    expect(cali).toMatchObject({
      numeroProceso: "001-LP-2026",
      entidad: "MUNICIPIO DE CALI",
      presupuesto: 2_450_000_000,
      departamentoCodigo: "76",
      municipio: "Cali",
      abierto: true,
      ubicacion: "entidad",
    });
    expect(m.find((p) => p.id === validos[1])).toMatchObject({
      presupuesto: null,
      municipio: null,
    });
    expect(m.find((p) => p.id === validos[2])).toMatchObject({
      departamento: "Nariño",
      municipio: null,
    });
    expect(m.find((p) => p.id === validos[3])!.tipoProyecto).toBeNull();
    expect(m.find((p) => p.id === validos[4])!.numeroProceso).toBe("0007-ABC");
  });
});
