/**
 * Lectura/escritura de `diagnostico`. Único módulo que conoce la forma de la
 * fila — mismo papel que [oferente/perfil-store.ts] para `oferente_perfil`.
 *
 * Append-only: nunca se actualizan las respuestas de un diagnóstico. Lo único
 * que se modifica después de insertar es `usuario_id`/`reclamado_en`, cuando
 * un anónimo se registra. El diagnóstico VIGENTE de un usuario es el más
 * reciente por `creado_en`.
 *
 * Aislamiento multi-tenant: toda lectura por cuenta filtra por `usuarioId` en
 * código de aplicación, que sigue siendo la única defensa real (CLAUDE.md §4).
 *
 * OJO con `respuestas` y `puntaje_areas`: Postgres reordena las claves de un
 * jsonb al almacenarlo (por longitud y luego alfabéticamente), así que el
 * objeto que vuelve del SELECT no conserva el orden de inserción. Los datos son
 * los mismos y el acceso por clave no se entera, pero comparar dos jsonb con
 * `JSON.stringify` da falsos negativos — verificado contra la base real. Usa
 * comparación semántica. `bloqueantes` no tiene ese problema: es `text[]` y el
 * orden sí se conserva, que es justo lo que necesita el plan de acción.
 */

import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { diagnostico } from "@/src/lib/db/schema/diagnostico";
import { getCuestionario } from "./registro";
import { bandaDePuntaje, filtrarBloqueoAbsoluto } from "./calcular";
import type {
  CategoriaId,
  EscalonContratacion,
  RemedioId,
  RespuestasDiagnostico,
  ResultadoDiagnostico,
} from "./types";

/** Un diagnóstico ya persistido: el resultado más la identidad de la fila. */
export interface DiagnosticoGuardado extends ResultadoDiagnostico {
  id: string;
  usuarioId: string | null;
  respuestas: RespuestasDiagnostico;
  creadoEn: Date;
}

export type ResultadoGuardar = { ok: true; id: string } | { ok: false; error: "DB_UNAVAILABLE" };

/** Fila cruda tal como la devuelve el SELECT. */
interface FilaDiagnostico {
  id: string;
  usuarioId: string | null;
  version: string;
  respuestas: unknown;
  puntajeTotal: number;
  puntajeAreas: unknown;
  escalon: string | null;
  bloqueantes: string[];
  creadoEn: Date;
}

/**
 * Reconstruye el resultado desde la fila. Los campos que SÍ se guardaron se
 * leen tal cual —son la foto del día en que se respondió, y las reglas pueden
 * haber cambiado desde entonces—; `bloqueoAbsoluto` y `estadoRup` se derivan
 * del catálogo porque no son columnas.
 *
 * La derivación usa el catálogo de la versión de la fila, resuelto por
 * `registro.ts`. Una versión que ya no está en el binario degrada a valores
 * neutros en vez de mentir con un catálogo que no es el suyo.
 */
export function mapDiagnosticoRow(fila: FilaDiagnostico): DiagnosticoGuardado {
  const bloqueantes = fila.bloqueantes as RemedioId[];
  const respuestas = fila.respuestas as RespuestasDiagnostico;
  // El catálogo de SU versión, no el vigente: los textos y las derivaciones
  // tienen que corresponder a lo que esa persona respondió.
  const cuestionario = getCuestionario(fila.version);

  return {
    id: fila.id,
    usuarioId: fila.usuarioId,
    version: fila.version,
    respuestas,
    puntajeTotal: fila.puntajeTotal,
    // La banda no es columna: es una partición del puntaje, que sí lo es.
    banda: bandaDePuntaje(fila.puntajeTotal),
    puntajeAreas: fila.puntajeAreas as Record<CategoriaId, number>,
    escalon: (fila.escalon as EscalonContratacion | null) ?? null,
    estadoRup: cuestionario?.estadoRup?.(respuestas) ?? "desconocido",
    bloqueantes,
    bloqueoAbsoluto: cuestionario ? filtrarBloqueoAbsoluto(bloqueantes, cuestionario.remedios) : [],
    creadoEn: fila.creadoEn,
  };
}

const COLUMNAS = {
  id: diagnostico.id,
  usuarioId: diagnostico.usuarioId,
  version: diagnostico.version,
  respuestas: diagnostico.respuestas,
  puntajeTotal: diagnostico.puntajeTotal,
  puntajeAreas: diagnostico.puntajeAreas,
  escalon: diagnostico.escalon,
  bloqueantes: diagnostico.bloqueantes,
  creadoEn: diagnostico.creadoEn,
};

export async function guardarDiagnostico(input: {
  usuarioId: string | null;
  sessionToken: string | null;
  respuestas: RespuestasDiagnostico;
  resultado: ResultadoDiagnostico;
}): Promise<ResultadoGuardar> {
  try {
    const [fila] = await db
      .insert(diagnostico)
      .values({
        usuarioId: input.usuarioId,
        sessionToken: input.sessionToken,
        version: input.resultado.version,
        respuestas: input.respuestas,
        puntajeTotal: input.resultado.puntajeTotal,
        puntajeAreas: input.resultado.puntajeAreas,
        escalon: input.resultado.escalon,
        bloqueantes: input.resultado.bloqueantes,
        // Un diagnóstico que nace con cuenta ya está reclamado.
        reclamadoEn: input.usuarioId ? new Date() : null,
      })
      .returning({ id: diagnostico.id });

    return { ok: true, id: fila.id };
  } catch {
    // Modo concierge, igual que app/api/perfil/route.ts: la base no alcanzable
    // no puede costarle al usuario el resultado que ya calculamos.
    return { ok: false, error: "DB_UNAVAILABLE" };
  }
}

/** El más reciente de una cuenta. */
export async function getDiagnosticoVigente(
  usuarioId: string
): Promise<DiagnosticoGuardado | null> {
  const [fila] = await db
    .select(COLUMNAS)
    .from(diagnostico)
    .where(eq(diagnostico.usuarioId, usuarioId))
    .orderBy(desc(diagnostico.creadoEn))
    .limit(1);

  return fila ? mapDiagnosticoRow(fila as FilaDiagnostico) : null;
}

/** El más reciente de un visitante anónimo, para que al volver encuentre lo suyo. */
export async function getDiagnosticoPorSessionToken(
  sessionToken: string
): Promise<DiagnosticoGuardado | null> {
  const [fila] = await db
    .select(COLUMNAS)
    .from(diagnostico)
    .where(eq(diagnostico.sessionToken, sessionToken))
    .orderBy(desc(diagnostico.creadoEn))
    .limit(1);

  return fila ? mapDiagnosticoRow(fila as FilaDiagnostico) : null;
}

/**
 * Asocia a una cuenta los diagnósticos anónimos de esa cookie. Idempotente por
 * el `IS NULL`: reclamar dos veces no reasigna nada ni pisa el `usuario_id` de
 * un diagnóstico que ya tenía dueño (por ejemplo si dos personas compartieron
 * navegador). Devuelve cuántas filas se reclamaron.
 *
 * Nunca lanza: se ejecuta dentro del flujo de registro/login, y un fallo aquí
 * no puede impedirle a nadie entrar a su cuenta.
 */
export async function reclamarDiagnosticos(
  sessionToken: string,
  usuarioId: string
): Promise<number> {
  try {
    const filas = await db
      .update(diagnostico)
      .set({ usuarioId, reclamadoEn: new Date() })
      .where(and(eq(diagnostico.sessionToken, sessionToken), isNull(diagnostico.usuarioId)))
      .returning({ id: diagnostico.id });

    return filas.length;
  } catch {
    return 0;
  }
}
