import path from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/pglite/migrator";
vi.mock("@/src/lib/db/client", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const schema = await import("@/src/lib/db/schema");
  const client = new PGlite();
  return { db: drizzle(client, { schema }) };
});
import { db } from "@/src/lib/db/client";
import { usuario, proceso, senalUsuario } from "@/src/lib/db/schema";
import {
  guardarProceso,
  quitarProceso,
  registrarVisita,
  borrarRecientes,
  listarMisProcesos,
  estadoGuardados,
} from "@/src/lib/mis-procesos/store";
const A = { usuarioId: "personal-a" },
  B = { usuarioId: "personal-b" };
beforeAll(async () => {
  await migrate(db as never, { migrationsFolder: path.resolve("drizzle") });
  await db.insert(usuario).values([
    { id: A.usuarioId, email: "personal-a@test.co" },
    { id: B.usuarioId, email: "personal-b@test.co" },
  ]);
  await db.insert(proceso).values(
    Array.from({ length: 14 }, (_, i) => ({
      secopProcesoId: `CO1.REQ.${i + 1}`,
      objeto: `Objeto ${i + 1}`,
      estadoApertura: i === 0 ? "Cerrado" : "Abierto",
    }))
  );
  await db.insert(senalUsuario).values([
    { usuarioId: A.usuarioId, senal: "operador" },
    { usuarioId: A.usuarioId, senal: "uso:extractor_pliego" },
  ]);
});
describe("listas personales sin cambios de esquema", () => {
  it("guardar es idempotente y otra cuenta no lo puede quitar ni leer", async () => {
    await Promise.all([guardarProceso(A, "CO1.REQ.1"), guardarProceso(A, "CO1.REQ.1")]);
    expect(await estadoGuardados(A.usuarioId, ["CO1.REQ.1"])).toEqual(["CO1.REQ.1"]);
    await quitarProceso(B.usuarioId, "CO1.REQ.1");
    expect((await listarMisProcesos(A.usuarioId, 1)).totalGuardados).toBe(1);
    expect((await listarMisProcesos(B.usuarioId, 1)).guardados).toEqual([]);
  });
  it("conserva diez visitas distintas y una repetida sube sin duplicarse", async () => {
    for (let i = 1; i <= 11; i++) await registrarVisita(A, `CO1.REQ.${i}`);
    await Promise.all([registrarVisita(A, "CO1.REQ.12"), registrarVisita(A, "CO1.REQ.13")]);
    await registrarVisita(A, "CO1.REQ.5");
    const listas = await listarMisProcesos(A.usuarioId, 1);
    expect(listas.recientes).toHaveLength(10);
    expect(listas.recientes[0].procesoId).toBe("CO1.REQ.5");
    expect(new Set(listas.recientes.map((p) => p.procesoId)).size).toBe(10);
  });
  it("borrar recientes conserva guardados, intención y cuota del extractor", async () => {
    await borrarRecientes(A.usuarioId);
    const listas = await listarMisProcesos(A.usuarioId, 1);
    expect(listas.recientes).toEqual([]);
    expect(listas.guardados).toHaveLength(1);
    const filas = await db
      .select()
      .from(senalUsuario)
      .where(eq(senalUsuario.usuarioId, A.usuarioId));
    expect(filas.map((f) => f.senal)).toContain("operador");
    expect(filas.map((f) => f.senal)).toContain("uso:extractor_pliego");
  });
  it("un cerrado sigue visible y un retirado se puede quitar", async () => {
    expect((await listarMisProcesos(A.usuarioId, 1)).guardados[0].estadoApertura).toBe("Cerrado");
    await db
      .update(proceso)
      .set({ deletedAt: new Date() })
      .where(eq(proceso.secopProcesoId, "CO1.REQ.1"));
    expect((await listarMisProcesos(A.usuarioId, 1)).guardados[0].disponible).toBe(false);
    await expect(guardarProceso(A, "CO1.REQ.1")).rejects.toThrow("disponible");
    await quitarProceso(A.usuarioId, "CO1.REQ.1");
    await quitarProceso(A.usuarioId, "CO1.REQ.1");
    expect((await listarMisProcesos(A.usuarioId, 1)).totalGuardados).toBe(0);
  });
  it("rechaza identificadores parciales y borra por cascada al eliminar usuario", async () => {
    await expect(guardarProceso(B, "REQ.2")).rejects.toThrow();
    await guardarProceso(B, "CO1.REQ.2");
    await registrarVisita(B, "CO1.REQ.2");
    await db.delete(usuario).where(eq(usuario.id, B.usuarioId));
    expect(
      await db.select().from(senalUsuario).where(eq(senalUsuario.usuarioId, B.usuarioId))
    ).toEqual([]);
  });
});
