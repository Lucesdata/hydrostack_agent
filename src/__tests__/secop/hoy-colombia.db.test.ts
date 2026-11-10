/**
 * «Hoy en Colombia» se evalúa una vez por consulta, no fila a fila (medido en la base
 * viva: 8,4 s frente a 174 ms). Se fija el plan en PGlite con las migraciones reales,
 * el SQL generado y que nadie vuelva a escribir la expresión en línea.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("@/src/lib/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/src/lib/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }), pool: { end: () => client.close() }, schema };
});

import { db } from "@/src/lib/db/client";
import { proceso } from "@/src/lib/db/schema";
import { condicionAbierto } from "@/src/lib/secop/agregados";
import { diaEnColombia } from "@/src/lib/secop/estados-abierto";
import { hoyEnColombia } from "@/src/lib/secop/hoy-colombia";
import { tramoDeRelevancia } from "@/src/lib/secop/vitrina";

const dialect = new PgDialect();
const texto = (q: Parameters<PgDialect["sqlToQuery"]>[0]) => dialect.sqlToQuery(q).sql;

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve(__dirname, "../../../drizzle") });
  await db.insert(proceso).values([
    {
      secopProcesoId: "A",
      estadoApertura: "Abierto",
      estadoActual: "Publicado",
      fechaRecepcion: "2999-01-01",
    },
    {
      secopProcesoId: "B",
      estadoApertura: "Abierto",
      estadoActual: "Publicado",
      fechaRecepcion: "2000-01-01",
    },
  ]);
}, 30000);

describe("hoyEnColombia", () => {
  it("es el día de Colombia, el mismo que el espejo de JavaScript", async () => {
    const antes = diaEnColombia(new Date());
    const r = await db.execute(sql`select ${hoyEnColombia()}::text as hoy`);
    const despues = diaEnColombia(new Date());
    expect([antes, despues]).toContain((r.rows[0] as { hoy: string }).hoy);
  });

  it("condicionAbierto y el orden de la vitrina lo piden como subselect, no en línea", () => {
    for (const q of [condicionAbierto()!, tramoDeRelevancia()]) {
      const s = texto(q);
      expect(s).toContain("(select (now() at time zone 'America/Bogota')::date)");
      expect(s.replace("(select (now() at time zone 'America/Bogota')::date)", "")).not.toContain(
        "at time zone"
      );
    }
  });

  it("el plan lo evalúa una vez (InitPlan) y sigue contando lo mismo", async () => {
    const plan = await db.execute(
      sql`explain select count(*) from proceso where ${condicionAbierto()}`
    );
    const lineas = plan.rows.map((r) => Object.values(r)[0] as string).join("\n");
    expect(lineas).toContain("InitPlan");
    expect(lineas).not.toMatch(/Filter:[^\n]*(AT TIME ZONE|timezone\()/i);
    const n = await db.execute(
      sql`select count(*)::int as n from proceso where ${condicionAbierto()}`
    );
    expect((n.rows[0] as { n: number }).n).toBe(1);
  });
});

describe("nadie la escribe en línea", () => {
  function archivos(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
      const p = path.join(dir, f);
      return statSync(p).isDirectory() ? archivos(p) : /\.(ts|tsx|js|jsx)$/.test(f) ? [p] : [];
    });
  }
  it("`now() at time zone` solo vive en hoy-colombia.ts", () => {
    const raiz = path.resolve(__dirname, "../../..");
    const infractores = [
      ...archivos(path.join(raiz, "src/lib")),
      ...archivos(path.join(raiz, "app")),
    ]
      .filter((f) => !f.endsWith("hoy-colombia.ts"))
      .filter((f) =>
        /now\(\)\s+at\s+time\s+zone/i.test(
          readFileSync(f, "utf8").replace(/^\s*(\*|\/\/).*$/gm, "")
        )
      );
    expect(infractores).toEqual([]);
  });
});
