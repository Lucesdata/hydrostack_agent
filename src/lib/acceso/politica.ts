/**
 * Política de acceso por niveles — única fuente de verdad de "quién puede qué".
 *
 * Antes de este módulo la respuesta estaba repartida entre `PROTECTED_PREFIXES`
 * de middleware.ts, una veintena de llamadas sueltas a `getSessionUser()` y
 * gates dentro de componentes. Las tres se separaron de la realidad: el
 * docstring de middleware.ts llegó a documentar un gate que no existía. La
 * tabla de abajo existe para que esa pregunta se responda leyendo una pantalla.
 *
 * Deliberadamente no importa nada del dominio de SECOP ni de la base: es una
 * función de (nivel, capacidad) → booleano y nada más. Quien redacta un
 * veredicto o protege una ruta consulta aquí y aplica el resultado en su
 * propia capa.
 */

import type { SessionUser } from "@/src/lib/supabase/get-session-user";

/** Ordinales: cada nivel puede todo lo del anterior. */
export type Nivel = "anonimo" | "gratis" | "pro";

const ORDEN: Record<Nivel, number> = {
  anonimo: 0,
  gratis: 1,
  pro: 2,
};

export type Capacidad =
  | "explorar"
  | "detalle_proceso"
  | "veredicto_resumen"
  | "veredicto_detalle"
  | "diagnostico"
  | "perfil_guardar"
  | "coincidencias"
  | "alertas"
  | "pliego_extraer"
  | "asistentes";

/**
 * La tabla. `veredicto_resumen` es el semáforo agregado y el estado de cada
 * compuerta; `veredicto_detalle` es el `reason` que explica cada estado — esa
 * es la frontera de captura de leads del producto.
 *
 * `pliego_extraer` y `asistentes` están en `pro` pero la frontera todavía no se
 * aplica: hoy esas rutas exigen cuenta vía `PROTECTED_PREFIXES` y con eso
 * siguen. Activarlas es cambiar sus handlers para consultar `puede()`.
 */
const NIVEL_MINIMO: Record<Capacidad, Nivel> = {
  explorar: "anonimo",
  detalle_proceso: "anonimo",
  veredicto_resumen: "anonimo",
  veredicto_detalle: "gratis",
  diagnostico: "anonimo",
  perfil_guardar: "gratis",
  coincidencias: "gratis",
  alertas: "gratis",
  pliego_extraer: "pro",
  asistentes: "pro",
};

/**
 * El nivel de quien hace la petición. La sesión manda: sin usuario es
 * `anonimo` aunque llegue un plan por parámetro. Un plan desconocido degrada a
 * `gratis` — nunca se otorga `pro` por un valor que no reconocemos.
 */
export function nivelDe(user: SessionUser | null, plan?: string | null): Nivel {
  if (!user) return "anonimo";
  return plan === "pro" ? "pro" : "gratis";
}

export function puede(nivel: Nivel, capacidad: Capacidad): boolean {
  return ORDEN[nivel] >= ORDEN[NIVEL_MINIMO[capacidad]];
}
