import { sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import type { CuentaProcesos, ListasProcesos, ProcesoPersonal } from "./types";
import { validarId, validarPagina, ProcesoNoDisponibleError } from "./validacion";

// Registros de estado personal, excluidos de cualquier análisis de intención.
export const PREFIJO_GUARDADO = "personal:guardado:v1:";
export const PREFIJO_VISITA = "personal:visita:v1:";
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function bloquear(tx: Tx, usuarioId: string) {
  const result = await tx.execute(sql`SELECT id FROM usuario WHERE id=${usuarioId} FOR UPDATE`);
  if (!result.rows.length) throw new Error("No se pudo verificar la cuenta.");
}
async function comprobarProceso(tx: Tx, id: string) {
  const r = await tx.execute(
    sql`SELECT id FROM proceso WHERE secop_proceso_id=${id} AND deleted_at IS NULL`
  );
  if (!r.rows.length)
    throw new ProcesoNoDisponibleError("El proceso ya no está disponible en AquaLicita.");
}
export async function guardarProceso(cuenta: CuentaProcesos, procesoId: string): Promise<void> {
  const id = validarId(procesoId),
    clave = PREFIJO_GUARDADO + id;
  await db.transaction(async (tx) => {
    await bloquear(tx, cuenta.usuarioId);
    await comprobarProceso(tx, id);
    await tx.execute(sql`INSERT INTO senal_usuario (usuario_id,senal,creado_en)
      SELECT ${cuenta.usuarioId},${clave},clock_timestamp()
      WHERE NOT EXISTS (SELECT 1 FROM senal_usuario WHERE usuario_id=${cuenta.usuarioId} AND senal=${clave})`);
  });
}
export async function quitarProceso(usuarioId: string, procesoId: string): Promise<void> {
  const clave = PREFIJO_GUARDADO + validarId(procesoId);
  await db.transaction(async (tx) => {
    await bloquear(tx, usuarioId);
    await tx.execute(
      sql`DELETE FROM senal_usuario WHERE usuario_id=${usuarioId} AND senal=${clave}`
    );
  });
}
export async function registrarVisita(cuenta: CuentaProcesos, procesoId: string): Promise<void> {
  const id = validarId(procesoId),
    clave = PREFIJO_VISITA + id;
  await db.transaction(async (tx) => {
    await bloquear(tx, cuenta.usuarioId);
    await comprobarProceso(tx, id);
    await tx.execute(
      sql`DELETE FROM senal_usuario WHERE usuario_id=${cuenta.usuarioId} AND senal=${clave}`
    );
    await tx.execute(
      sql`INSERT INTO senal_usuario (usuario_id,senal,creado_en) VALUES (${cuenta.usuarioId},${clave},clock_timestamp())`
    );
    await tx.execute(sql`DELETE FROM senal_usuario WHERE usuario_id=${cuenta.usuarioId} AND senal LIKE ${PREFIJO_VISITA + "%"}
      AND id NOT IN (SELECT id FROM senal_usuario WHERE usuario_id=${cuenta.usuarioId} AND senal LIKE ${PREFIJO_VISITA + "%"}
        ORDER BY creado_en DESC,senal ASC,id ASC LIMIT 10)`);
  });
}
export async function borrarRecientes(usuarioId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await bloquear(tx, usuarioId);
    await tx.execute(
      sql`DELETE FROM senal_usuario WHERE usuario_id=${usuarioId} AND senal LIKE ${PREFIJO_VISITA + "%"}`
    );
  });
}
async function listar(
  usuarioId: string,
  prefijo: string,
  limite: number,
  offset: number
): Promise<ProcesoPersonal[]> {
  const result = await db.execute<ProcesoPersonal & Record<string, unknown>>(sql`
    WITH personal AS (
      SELECT substring(senal from ${prefijo.length + 1}::int) AS proceso_id,
        ${prefijo === PREFIJO_GUARDADO ? sql`min(creado_en)` : sql`max(creado_en)`} AS fecha
      FROM senal_usuario WHERE usuario_id=${usuarioId} AND senal LIKE ${prefijo + "%"}
      GROUP BY senal
    ) SELECT s.proceso_id AS "procesoId",p.objeto,e.nombre AS entidad,p.referencia,
      p.estado_apertura AS "estadoApertura",p.valor_estimado::text AS "valorEstimado",
      (p.id IS NOT NULL AND p.deleted_at IS NULL) AS disponible,
      EXISTS(SELECT 1 FROM senal_usuario g WHERE g.usuario_id=${usuarioId} AND g.senal=${PREFIJO_GUARDADO}||s.proceso_id) AS guardado,
      s.fecha::text AS fecha
    FROM personal s LEFT JOIN proceso p ON p.secop_proceso_id=s.proceso_id LEFT JOIN entidad e ON e.id=p.entidad_id
    ORDER BY s.fecha DESC,s.proceso_id ASC LIMIT ${limite} OFFSET ${offset}`);
  return result.rows.map((row) => ({ ...row, fecha: new Date(row.fecha).toISOString() }));
}
export async function listarMisProcesos(
  usuarioId: string,
  pagina: number
): Promise<ListasProcesos> {
  const page = validarPagina(pagina);
  const [guardados, recientes, count] = await Promise.all([
    listar(usuarioId, PREFIJO_GUARDADO, 25, (page - 1) * 25),
    listar(usuarioId, PREFIJO_VISITA, 10, 0),
    db.execute<{ n: number }>(
      sql`SELECT count(DISTINCT senal)::int AS n FROM senal_usuario WHERE usuario_id=${usuarioId} AND senal LIKE ${PREFIJO_GUARDADO + "%"}`
    ),
  ]);
  return { guardados, recientes, pagina: page, totalGuardados: count.rows[0].n };
}
export async function estadoGuardados(usuarioId: string, ids: string[]): Promise<string[]> {
  if (!ids.length) return [];
  if (ids.length > 25) throw new Error("Demasiados procesos.");
  const claves = ids.map((id) => PREFIJO_GUARDADO + validarId(id));
  const result = await db.execute<{ senal: string }>(
    sql`SELECT DISTINCT senal FROM senal_usuario WHERE usuario_id=${usuarioId} AND senal IN (${sql.join(
      claves.map((c) => sql`${c}`),
      sql`,`
    )})`
  );
  return result.rows.map((r) => r.senal.slice(PREFIJO_GUARDADO.length));
}
