/**
 * Última capa del entorno local (docs/entorno-local.md), después de cargar la
 * muestra de SECOP y el transform:
 *
 * 1. Fechas relativas a hoy. La muestra es de junio de 2026 y el transform deja
 *    sin fechas buena parte de las filas; sin esto la vitrina no tiene «Nuevo»,
 *    cuenta atrás de cierre ni recepciones vencidas. Cada proceso recibe un
 *    desfase fijo derivado de su id (`hashtext`), así que dos corridas el mismo
 *    día dan la misma base.
 * 2. Limpia lo que los usuarios de prueba hicieron en corridas anteriores
 *    (guardados, recientes, filtros, coincidencias, diagnóstico), para que cada
 *    `preparar` empiece igual.
 * 3. Los usuarios de prueba de `src/lib/sesion-local/sesion-local.ts`, y un
 *    perfil de oferente completo para el que lo pide (Ana), hecho con los
 *    UNSPSC y departamentos que más abiertos tienen en la muestra.
 *
 * Idempotente. Solo corre contra un Postgres local: se niega con cualquier
 * DATABASE_URL que no apunte a localhost o 127.0.0.1.
 */
import "../_env";
import { sql } from "drizzle-orm";
import { db, pool } from "@/src/lib/db/client";
import { oferentePerfil, usuario } from "@/src/lib/db/schema";
import { USUARIOS_LOCALES } from "@/src/lib/sesion-local/sesion-local";
import type { OferenteProfile } from "@/src/lib/oferente/types";

function exigirBaseLocal() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    throw new Error(
      `sembrar.ts solo corre contra un Postgres local; DATABASE_URL=${url || "(vacía)"}`
    );
  }
}

async function fechasRelativasAHoy() {
  // h1: publicación entre hoy y hace 44 días (0 y 1 dan «Nuevo»).
  // h2: recepción de los abiertos entre hace 8 días (vencida) y dentro de 31.
  await db.execute(sql`
    update proceso set
      fecha_publicacion = current_date - (abs(hashtext(secop_proceso_id)) % 45),
      fecha_recepcion = case
        when estado_apertura = 'Abierto'
          then current_date + ((abs(hashtext(secop_proceso_id || ':r')) % 40) - 8)
        else current_date - (abs(hashtext(secop_proceso_id || ':r')) % 60) - 1
      end,
      fecha_adjudicacion = case
        when estado_apertura = 'Cerrado' and estado_actual = 'Seleccionado'
          then current_date - (abs(hashtext(secop_proceso_id || ':a')) % 25)
        else fecha_adjudicacion
      end,
      adjudicado = case
        when estado_apertura = 'Cerrado' and estado_actual = 'Seleccionado' then true
        else adjudicado
      end,
      updated_at = now()`);
}

async function masFrecuentes(columna: "unspsc" | "depto", n: number): Promise<string[]> {
  const expr =
    columna === "unspsc"
      ? sql`regexp_replace(unspsc, '^V\\d+\\.', '')`
      : sql`left(geografia_id, 2)`;
  const r = await db.execute(sql`
    select ${expr} as v, count(*) as n from proceso
     where estado_apertura = 'Abierto' and ${expr} is not null and ${expr} ~ '^[0-9]+$'
     group by 1 order by 2 desc limit ${n}`);
  return (r as unknown as { rows: { v: string }[] }).rows.map((f) => f.v);
}

/** Tablas con datos de cuenta; `usuario` y `oferente_perfil` se rehacen abajo. */
const TABLAS_DE_CUENTA: [string, "usuario_id" | "account_id"][] = [
  ["al_descartes", "account_id"],
  ["al_reportes", "account_id"],
  ["al_filtros_usuario", "account_id"],
  ["coincidencia", "usuario_id"],
  ["envio_log", "usuario_id"],
  ["alerta_preferencias", "usuario_id"],
  ["senal_usuario", "usuario_id"],
  ["diagnostico", "usuario_id"],
];

async function limpiarUsuariosDePrueba() {
  const ids = USUARIOS_LOCALES.map((u) => u.id);
  for (const [tabla, columna] of TABLAS_DE_CUENTA) {
    await db.execute(
      sql`delete from ${sql.identifier(tabla)} where ${sql.identifier(columna)} in ${ids}`
    );
  }
}

async function usuariosYPerfil() {
  for (const u of USUARIOS_LOCALES) {
    await db
      .insert(usuario)
      .values({ id: u.id, email: u.email, name: u.nombre })
      .onConflictDoNothing();
  }
  const unspsc = await masFrecuentes("unspsc", 4);
  const deptos = await masFrecuentes("depto", 3);
  for (const u of USUARIOS_LOCALES.filter((x) => x.conPerfil)) {
    const perfil: OferenteProfile = {
      id: u.id,
      tipoPersona: "juridica",
      // Clase UNSPSC (6 dígitos): la compuerta sectorial compara por prefijo.
      sectoresUnspsc: unspsc.map((c) => c.slice(0, 6)),
      capacidadFinanciera: {
        capitalTrabajoCop: 2_000_000_000,
        indiceLiquidez: 2.5,
        indiceEndeudamiento: 0.45,
        razonCoberturaIntereses: 4,
        fuente: "manual",
        vigenciaHasta: `${new Date().getFullYear() + 1}-12-31`,
      },
      kCapacidadResidualCop: 10_000_000_000,
      cobertura: { departamentos: deptos, municipios: [] },
      cuantiaObjetivo: { minCop: 50_000_000, maxCop: 20_000_000_000 },
    };
    await db
      .insert(oferentePerfil)
      .values({ usuarioId: u.id, perfil })
      .onConflictDoUpdate({
        target: oferentePerfil.usuarioId,
        set: { perfil, actualizadoEn: new Date() },
      });
    console.log(
      `perfil de ${u.email}: UNSPSC ${perfil.sectoresUnspsc.join(", ")} · deptos ${deptos.join(", ")}`
    );
  }
}

async function main() {
  exigirBaseLocal();
  await fechasRelativasAHoy();
  await limpiarUsuariosDePrueba();
  await usuariosYPerfil();
  const r = await db.execute(sql`
    select count(*) filter (where estado_apertura = 'Abierto' and estado_actual in ('Publicado','Abierto')) as abiertos,
           count(*) filter (where fecha_publicacion >= current_date - 1) as nuevos,
           count(*) filter (where estado_apertura = 'Abierto' and fecha_recepcion < current_date) as vencidos
      from proceso where deleted_at is null`);
  console.log("procesos:", (r as unknown as { rows: unknown[] }).rows[0]);
  console.log(`usuarios de prueba: ${USUARIOS_LOCALES.map((u) => u.email).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
