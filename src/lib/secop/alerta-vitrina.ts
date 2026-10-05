/**
 * «Avisarme de procesos nuevos así» (fase 3 de la vitrina, tarea 5): los filtros
 * de `/licitaciones` traducidos a un filtro guardado de `al_filtros_usuario`,
 * el que el cron convierte en coincidencias y el correo diario anuncia.
 *
 * Puro: devuelve el cuerpo de `POST /api/al/filtros`, que lo valida con
 * `validarFiltro` como cualquier otro filtro. Lo que la vitrina sabe y el
 * filtro no, se dice en `diferencias` para pintarlo antes de guardar:
 *
 * - En la vitrina, la búsqueda mira el objeto, la entidad y el municipio; en el
 *   filtro, la palabra clave se busca en el texto del proceso (objeto y
 *   descripción). Buscar «Medellín» en la vitrina trae lo de la entidad de
 *   Medellín; como alerta, solo lo que diga Medellín en su texto.
 * - El orden no es un criterio: una alerta avisa de lo nuevo, no ordena.
 * - La actividad tampoco: el filtro guardado no la tiene, así que la alerta
 *   avisa de todo lo demás y la vitrina lo dice antes de guardar.
 * - La búsqueda por número es una consulta puntual, no algo que vigilar.
 */

import { TIPO_PROYECTO } from "../classify/tipo-proyecto";
import {
  ETIQUETA_SISTEMA,
  SISTEMAS_AGRUPADOS,
  tiposDeSistema,
  type SistemaBusqueda,
} from "./busqueda-guiada";
import { etiquetaPresupuesto, type FiltrosVitrina } from "./filtros-vitrina";

export interface DepartamentoAlerta {
  /** Código DIVIPOLA de 2 dígitos: el filtro lo compara por prefijo. */
  codigo: string;
  label: string;
}

export interface CuerpoAlerta {
  nombre: string;
  palabrasClave: string[];
  tiposProyecto: string[];
  divipola: string[];
  valorMin: number | null;
}

/**
 * ¿Hay algo que vigilar? El orden y la actividad solos no cuentan: serían una
 * alerta de todo. Con número de proceso, tampoco.
 */
export function hayCriteriosDeAlerta(f: FiltrosVitrina): boolean {
  if (f.numero) return false;
  return !!(f.q || f.tipo || f.departamento || f.presupuestoMin);
}

function etiquetaTipo(tipo: SistemaBusqueda): string {
  return (SISTEMAS_AGRUPADOS as readonly string[]).includes(tipo)
    ? ETIQUETA_SISTEMA[tipo as keyof typeof ETIQUETA_SISTEMA]
    : TIPO_PROYECTO[tipo as keyof typeof TIPO_PROYECTO].label;
}

/** Lo que va a vigilar la alerta, en frases cortas para el resumen. */
export function criteriosDeAlerta(
  f: FiltrosVitrina,
  departamento: DepartamentoAlerta | null
): string[] {
  const out: string[] = [];
  if (f.tipo) out.push(`Tipo de obra: ${etiquetaTipo(f.tipo)}`);
  if (departamento) out.push(`Entidad en ${departamento.label}`);
  if (f.presupuestoMin) out.push(`Presupuesto ${etiquetaPresupuesto(f.presupuestoMin)}`);
  if (f.q) out.push(`Que el proceso mencione «${f.q}»`);
  return out;
}

/** «PTAR · Boyacá · desde $500 M · «colector»», recortado al largo que admite el filtro. */
export function nombreDeAlerta(f: FiltrosVitrina, departamento: DepartamentoAlerta | null): string {
  const partes = [
    f.tipo ? etiquetaTipo(f.tipo) : null,
    departamento?.label ?? null,
    f.presupuestoMin ? etiquetaPresupuesto(f.presupuestoMin) : null,
    f.q ? `«${f.q}»` : null,
  ].filter((p): p is string => !!p);
  const nombre = partes.join(" · ") || "Procesos de agua";
  return nombre.length > 120 ? `${nombre.slice(0, 119)}…` : nombre;
}

/**
 * El cuerpo de `POST /api/al/filtros`. El departamento llega ya resuelto (slug
 * → código) por quien tiene la lista; uno que no se resolvió no se guarda.
 */
export function filtroDesdeVitrina(
  f: FiltrosVitrina,
  departamento: DepartamentoAlerta | null,
  nombre = nombreDeAlerta(f, departamento)
): CuerpoAlerta {
  return {
    nombre,
    palabrasClave: f.q ? [f.q] : [],
    tiposProyecto: f.tipo ? [...tiposDeSistema(f.tipo)] : [],
    divipola: departamento ? [departamento.codigo] : [],
    valorMin: f.presupuestoMin ? f.presupuestoMin * 1_000_000 : null,
  };
}
