/**
 * Contratos del motor de matching determinista (SDD §6).
 *
 * Determinista de verdad: SQL + comparación de cadenas. Sin modelo, sin
 * embedding, sin llamada externa. Coste marginal cero por licitación.
 *
 * El trabajo real no está aquí, está en curar los códigos UNSPSC y el
 * diccionario de sinónimos. Y un fallo de curación **no produce falsos
 * positivos: produce silencio** — la licitación simplemente no aparece y nadie
 * se entera. `al_descartes` existe para que ese silencio sea auditable, y por
 * eso `evaluarFiltro` devuelve el motivo del rechazo y no solo un booleano.
 */

/** Los motivos que puede registrar `al_descartes`. */
export const MOTIVOS = [
  // capa 'ingesta' — la red sectorial de `secop/ingest-net.ts`
  "sin_unspsc_ni_keyword",
  "segmento_80_excluido",
  // capa 'filtro' — los criterios de una cuenta
  "palabra_excluida",
  "fuera_de_cuantia",
  "fuera_de_zona",
  "entidad_no_listada",
  "modalidad_no_listada",
] as const;

export type MotivoDescarte = (typeof MOTIVOS)[number];

/** La proyección mínima de un proceso que el evaluador necesita. */
export interface ProcesoEvaluable {
  secopProcesoId: string;
  objeto: string | null;
  nombre: string | null;
  descripcion: string | null;
  /** UNSPSC sin el prefijo "V1.". */
  unspsc: string | null;
  entidadNit: string | null;
  divipola: string | null;
  modalidad: string | null;
  valorEstimado: string | null;
}

/**
 * `motivo: null` es un match. Retorno nullable y no unión discriminada por la
 * misma razón que en el resto del módulo: el repo compila con `strict: false` y
 * `{ok:true}|{ok:false}` no estrecha.
 */
export interface ResultadoEvaluacion {
  motivo: MotivoDescarte | null;
  /** Qué se evaluó, contra qué campo y con qué resultado. Va a `al_descartes.evidencia`. */
  evidencia: Record<string, unknown> | null;
}

/**
 * Versión de la semántica de filtrado. **Se sube cada vez que se toca la lógica
 * o el diccionario.** Sin esto, `al_descartes` no distingue "lo descartamos con
 * la red vieja" de "lo descartamos con la nueva" y deja de ser auditoría: se
 * convierte en un montón de filas sin contexto.
 */
export const VERSION_FILTRO = "filtro-v1";

/**
 * Versión de la red sectorial de ingesta. Cambia cuando cambian
 * `SECTOR_KEYWORDS`, `WATER_EXCLUSIVE_UNSPSC` o `EXCLUDED_UNSPSC_SEGMENTS` en
 * `secop/ingest-net.ts`.
 */
export const VERSION_RED = "red-a2-v1";
