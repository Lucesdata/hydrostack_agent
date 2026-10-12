import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";
vi.mock("@/src/lib/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/src/lib/db/schema");
  return { db: drizzle(new PGlite(), { schema }) };
});
import { db } from "@/src/lib/db/client";
import { usuario } from "@/src/lib/db/schema";
import {
  consentimientoVigente,
  contactosConsentidos,
  registrarConsentimiento,
} from "@/src/lib/marketing/consentimiento";

beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve("drizzle") });
  await db.insert(usuario).values([
    { id: "m-ok", email: "ok@test.co", name: "Ok", emailVerified: new Date() },
    { id: "m-sinverificar", email: "nv@test.co" },
    { id: "m-baja", email: "baja@test.co", emailVerified: new Date() },
    { id: "m-nada", email: "nada@test.co", emailVerified: new Date() },
  ]);
});

describe("consentimiento de marketing", () => {
  it("alta, baja y exportación", async () => {
    await registrarConsentimiento("m-ok", true);
    await registrarConsentimiento("m-ok", true); // repetición: no duplica
    await registrarConsentimiento("m-sinverificar", true);
    await registrarConsentimiento("m-baja", true);
    await registrarConsentimiento("m-baja", false);
    await registrarConsentimiento("m-nada", false); // sin dato previo: no escribe

    expect(await consentimientoVigente("m-ok")).toBe("alta");
    expect(await consentimientoVigente("m-baja")).toBe("baja");
    expect(await consentimientoVigente("m-nada")).toBe("sin_dato");

    const filas = await db.execute(
      (await import("drizzle-orm"))
        .sql`SELECT count(*)::int AS n FROM senal_usuario WHERE usuario_id='m-ok'`
    );
    expect((filas.rows[0] as { n: number }).n).toBe(1);

    // Solo el consentido con correo verificado
    expect(await contactosConsentidos()).toEqual([{ email: "ok@test.co", nombre: "Ok" }]);
  });
});
