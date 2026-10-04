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
  | "diagnostico_historial"
  | "perfil_guardar"
  | "coincidencias"
  | "alertas"
  | "filtros"
  | "competidores"
  | "pliego_extraer";

/**
 * La tabla. `veredicto_resumen` es el semáforo agregado y el estado de cada
 * compuerta; `veredicto_detalle` es el `reason` que explica cada estado — esa
 * es la frontera de captura de leads del producto.
 *
 * `pliego_extraer` es `gratis` desde el 2026-09-27, decisión de producto: el
 * análisis de pliego vive en la §4 de cada ficha y basta una cuenta para subir
 * uno. Lo aplican las dos acciones de `src/lib/secop/pliego-actions.ts`. Era
 * `pro`, pero la frontera nunca se aplicó (toda cuenta es `gratis`), así que el
 * cambio no le quita nada a nadie. Hoy ninguna capacidad es `pro`: el nivel
 * sigue en el modelo para el día que haya plan de pago, y /precios no pinta su
 * columna mientras esté vacía (`seccionesPorNivel`). (`asistentes` también era
 * `pro`; salió con los asistentes el mismo día.)
 *
 * `competidores` (SDD módulo 2) es `gratis`: el histórico es dato de mercado, no
 * de nadie, pero navegarlo es una función de producto y no una landing. Desde
 * el 2026-09-27 se aplica en GET /api/ficha/[id]/rival/[key], el historial de
 * cada rival en la §7 de la ficha. Los
 * reportes públicos de mercado (`al_reportes` con `visibilidad='publico'`) son
 * otra cosa y ésos sí van sin cuenta.
 *
 * `filtros` (SDD `docs/sdd/00-esqueleto.md` §4.2) es `gratis`: declarar criterios
 * de búsqueda propios exige cuenta porque las filas cuelgan de una cuenta, pero
 * no es una frontera de pago. Explorar y ver el semáforo siguen siendo anónimos.
 *
 * `diagnostico` es anónimo pero `diagnostico_historial` no: responder no pide
 * cuenta, comparar tus respuestas en el tiempo sí — no hay historial sin a
 * quién atribuirlo. La ruta ya está en `PROTECTED_PREFIXES`; esta fila es lo
 * que evita que la tabla y el middleware vuelvan a contradecirse, que es
 * exactamente lo que este módulo existe para impedir.
 */
const NIVEL_MINIMO: Record<Capacidad, Nivel> = {
  explorar: "anonimo",
  detalle_proceso: "anonimo",
  veredicto_resumen: "anonimo",
  veredicto_detalle: "gratis",
  diagnostico: "anonimo",
  diagnostico_historial: "gratis",
  perfil_guardar: "gratis",
  coincidencias: "gratis",
  alertas: "gratis",
  filtros: "gratis",
  competidores: "gratis",
  pliego_extraer: "gratis",
};

/** Todas las capacidades, para iterarlas sin repetir la lista a mano. */
export const CAPACIDADES = Object.keys(NIVEL_MINIMO) as Capacidad[];

/**
 * El nivel de quien hace la petición. La sesión manda: sin usuario es
 * `anonimo` aunque llegue un plan por parámetro. Un plan desconocido degrada a
 * `gratis` — nunca se otorga `pro` por un valor que no reconocemos.
 *
 * `plan` es OBLIGATORIO, aunque acepte `null`. Siendo opcional, quien olvidara
 * consultarlo obtendría `gratis` en silencio y un cliente de pago se quedaría
 * sin lo que paga sin que nadie se entere: falla cerrado, que es lo seguro,
 * pero falla. Exigirlo obliga a decidir en cada llamador — `null` explícito en
 * las rutas que no necesitan mirar la base, que hoy son todas.
 */
export function nivelDe(user: SessionUser | null, plan: string | null): Nivel {
  if (!user) return "anonimo";
  return plan === "pro" ? "pro" : "gratis";
}

export function puede(nivel: Nivel, capacidad: Capacidad): boolean {
  return ORDEN[nivel] >= ORDEN[NIVEL_MINIMO[capacidad]];
}
