/**
 * Los conteos del mapa por familia contra un Postgres de verdad (PGlite con las
 * migraciones reales): lo que se prueba es SQL —los `FILTER`, el corte de 2026,
 * la regla de abiertos y el agrupado— y un mock no ejecuta nada de eso.
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
import { geografia, proceso } from "@/src/lib/db/schema";
import { conteosPorFamilia } from "@/src/lib/secop/conteos-familia";

let n = 0;
async function unProceso(v: {
  geo?: string | null;
  tipo?: string | null;
  publicado?: string | null;
  abierto?: boolean;
  borrado?: boolean;
}) {
  n += 1;
  await db.insert(proceso).values({
    secopProcesoId: `CO1.REQ.${n}`,
    referencia: `REF-${n}`,
    objeto: `Obra ${n}`,
    geografiaId: v.geo === undefined ? "76001" : v.geo,
    tipoProyecto: v.tipo === undefined ? "acueducto" : v.tipo,
    fechaPublicacion: v.publicado === undefined ? "2026-03-01" : v.publicado,
    estadoApertura: v.abierto ? "Abierto" : "Cerrado",
    estadoActual: v.abierto ? "Publicado" : "Adjudicado",
    fechaRecepcion: v.abierto ? "2099-12-31" : "2026-03-15",
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
    { codigoDivipola: "52000", departamentoCodigo: "52", departamentoNombre: "Nariño" },
    { codigoDivipola: "99999", departamentoCodigo: "00", departamentoNombre: "Inexistente" },
  ]);

  // Valle: potable 3 (uno de Buenaventura, uno abierto), PTAP también es potable.
  await unProceso({});
  await unProceso({ geo: "76109", abierto: true });
  await unProceso({ tipo: "ptap" });
  // Valle: residual 1, redes 2 (uno abierto).
  await unProceso({ tipo: "ptar" });
  await unProceso({ tipo: "alcantarillado" });
  await unProceso({ tipo: "alcantarillado", abierto: true });
  // Nariño: solo redes.
  await unProceso({ geo: "52000", tipo: "alcantarillado" });

  // No cuentan, cada uno por una razón.
  await unProceso({ publicado: "2025-12-31" }); // antes de 2026
  await unProceso({ publicado: null }); // sin fecha de publicación
  await unProceso({ tipo: "otros" }); // sin pestaña
  await unProceso({ tipo: null });
  await unProceso({ borrado: true });
  await unProceso({ geo: null }); // sin geografía
  await unProceso({ geo: "99999" }); // departamento que el mapa no dibuja
});

describe("conteosPorFamilia", () => {
  it("cuenta por departamento y familia, publicados en 2026 y, de ellos, los que reciben ofertas", async () => {
    const c = await conteosPorFamilia();
    const porDpto = Object.fromEntries(c.map((x) => [x.dpto, x]));
    expect(Object.keys(porDpto).sort()).toEqual(["52", "76"]);
    expect(porDpto["76"]).toEqual({
      dpto: "76",
      nombre: "Valle del Cauca",
      potable: { n: 3, abiertos: 1 },
      residual: { n: 1, abiertos: 0 },
      redes: { n: 2, abiertos: 1 },
    });
    expect(porDpto["52"]).toMatchObject({
      potable: { n: 0, abiertos: 0 },
      residual: { n: 0, abiertos: 0 },
      redes: { n: 1, abiertos: 0 },
    });
  });
});
