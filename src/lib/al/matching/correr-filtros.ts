/**
 * Orquestación del matching por filtros (SDD §6).
 *
 * Para cada filtro activo: prefiltro SQL, evaluación pura, y dos escrituras
 * simétricas — lo que pasa va a `coincidencia`, lo que no pasa va a
 * `al_descartes` con su motivo. Esa simetría es el punto entero del módulo: sin
 * la segunda mitad, lo que el filtro se pierde es invisible.
 *
 * **No se llama a `buildVerdict`** (SDD §6.4). El filtro decide si la licitación
 * *interesa*; el veredicto Nivel 0 decide si el oferente *puede participar*. Son
 * ortogonales: un proceso puede casar con el filtro y salir `FAIL`. Componer las
 * dos cosas es trabajo de la página y del correo, no del motor.
 */

import { eq } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { alFiltrosUsuario } from "@/src/lib/db/schema/aqualicita";
import { coincidencia } from "@/src/lib/db/schema/cuentas";
import type { FiltroValidado } from "@/src/lib/al/filtros/tipos";
import { buscarCandidatos, type OpcionesBusqueda } from "./buscar-candidatos";
import { evaluarFiltro } from "./evaluar-filtro";
import {
  registrarDescartes,
  limpiarDescartesDeFiltro,
  type DescarteInput,
} from "./registrar-descartes";
import { VERSION_FILTRO } from "./tipos";

export interface ResumenFiltro {
  filtroId: string;
  nombre: string;
  candidatos: number;
  coincidencias: number;
  descartes: number;
  /** Se alcanzó el tope de la búsqueda: hay candidatos sin evaluar. */
  truncado: boolean;
}

export interface ResumenCorrida {
  filtros: number;
  coincidencias: number;
  descartes: number;
  porFiltro: ResumenFiltro[];
}

/**
 * `coincidencia.veredicto_overall` es NOT NULL y su vocabulario viene del
 * veredicto Nivel 0. Una coincidencia que nace de un filtro no ha pasado por
 * ese motor, así que se escribe `UNKNOWN`: no es un valor de relleno, es la
 * verdad — todavía no sabemos si esta cuenta puede participar.
 */
const VEREDICTO_SIN_EVALUAR = "UNKNOWN";

export async function correrFiltro(
  filtro: typeof alFiltrosUsuario.$inferSelect,
  opts: OpcionesBusqueda = {}
): Promise<ResumenFiltro> {
  const criterios = filtro as unknown as FiltroValidado;
  // El universo se acota una sola vez por corrida; los criterios del filtro los
  // aplica entero `evaluarFiltro`, para que TODO descarte quede auditado.
  const { items: candidatos, truncado } = await buscarCandidatos(opts);
  if (truncado) {
    // Se avisa siempre, incluso si la corrida sigue: quedarse callado aquí es
    // perder licitaciones sin dejar rastro.
    console.warn(
      `[al:filtros] "${filtro.nombre}" alcanzó el tope de candidatos: hay procesos sin evaluar. Sube el límite.`
    );
  }

  const aciertos: typeof candidatos = [];
  const descartes: DescarteInput[] = [];

  for (const p of candidatos) {
    const r = evaluarFiltro(criterios, p);
    if (r.motivo === null) {
      aciertos.push(p);
      continue;
    }
    descartes.push({
      accountId: filtro.accountId,
      filtroId: filtro.id,
      secopProcesoId: p.secopProcesoId,
      objetoResumen: p.objeto ?? p.nombre,
      unspscObservado: p.unspsc,
      valorEstimado: p.valorEstimado,
      entidadNit: p.entidadNit,
      divipola: p.divipola,
      motivo: r.motivo,
      evidencia: r.evidencia,
      redVersion: VERSION_FILTRO,
    });
  }

  if (aciertos.length > 0) {
    await db
      .insert(coincidencia)
      .values(
        aciertos.map((p) => ({
          usuarioId: filtro.usuarioId,
          accountId: filtro.accountId,
          filtroId: filtro.id,
          procesoId: p.secopProcesoId,
          veredictoOverall: VEREDICTO_SIN_EVALUAR,
        }))
      )
      // La corrida es diaria y reevalúa el mismo universo: sin esto, el segundo
      // día reventaría contra el UNIQUE (usuario_id, proceso_id).
      .onConflictDoNothing({ target: [coincidencia.usuarioId, coincidencia.procesoId] });
  }

  // Los descartes del filtro se reemplazan, no se acumulan: interesa el estado
  // actual de qué se está perdiendo, no una copia por cada ejecución del cron.
  await limpiarDescartesDeFiltro(filtro.id);
  await registrarDescartes("filtro", descartes);

  return {
    filtroId: filtro.id,
    nombre: filtro.nombre,
    candidatos: candidatos.length,
    coincidencias: aciertos.length,
    descartes: descartes.length,
    truncado,
  };
}

export async function correrFiltrosActivos(opts: OpcionesBusqueda = {}): Promise<ResumenCorrida> {
  const filtros = await db
    .select()
    .from(alFiltrosUsuario)
    .where(eq(alFiltrosUsuario.activo, true));

  const porFiltro: ResumenFiltro[] = [];
  for (const f of filtros) porFiltro.push(await correrFiltro(f, opts));

  return {
    filtros: filtros.length,
    coincidencias: porFiltro.reduce((n, r) => n + r.coincidencias, 0),
    descartes: porFiltro.reduce((n, r) => n + r.descartes, 0),
    porFiltro,
  };
}
