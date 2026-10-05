/**
 * Los criterios del antiguo buscador guiado (#109) que sobreviven a la
 * unificación del 2026-10-05: agrupar tipos de obra por sistema y filtrar por
 * actividad. Desde entonces los usa la vitrina (`filtros-vitrina.ts`,
 * `vitrina.ts`), que es el único buscador; el explorador guiado y `/api/secop`
 * salieron.
 *
 * Puro: sin base.
 */

import { TIPOS_PROYECTO, TIPO_PROYECTO, type TipoProyecto } from "../classify/tipo-proyecto";

const [ACUEDUCTO, ALCANTARILLADO, PTAP, PTAR] = TIPOS_PROYECTO;

/** Los dos sistemas que agrupan tipos de obra, además de cada tipo suelto. */
export const SISTEMAS_AGRUPADOS = ["potable", "residual"] as const;
export type SistemaAgrupado = (typeof SISTEMAS_AGRUPADOS)[number];
export type SistemaBusqueda = SistemaAgrupado | TipoProyecto;

export const ETIQUETA_SISTEMA: Record<SistemaAgrupado, string> = {
  potable: `Agua potable (${TIPO_PROYECTO[ACUEDUCTO].label} y ${TIPO_PROYECTO[PTAP].label})`,
  residual: `Aguas residuales (${TIPO_PROYECTO[ALCANTARILLADO].label} y ${TIPO_PROYECTO[PTAR].label})`,
};

/** Para el `<select>` de la vitrina, que es estrecho; la pastilla lleva la larga. */
export const ETIQUETA_SISTEMA_CORTA: Record<SistemaAgrupado, string> = {
  potable: "Agua potable",
  residual: "Aguas residuales",
};

export type ActividadBusqueda =
  "obras" | "operacion" | "muestreo" | "consultoria" | "interventoria" | "suministros";

/** Menciones textuales, no clasificación: un proceso puede tener varias actividades. */
export const ACTIVIDADES_BUSQUEDA: {
  value: ActividadBusqueda;
  label: string;
  raices: readonly string[];
}[] = [
  { value: "obras", label: "Obras", raices: ["construcci", "rehabilit", "mejoramiento", "obra"] },
  { value: "operacion", label: "Operación y mantenimiento", raices: ["operaci", "mantenim"] },
  {
    value: "muestreo",
    label: "Muestreo y laboratorio",
    raices: ["muestreo", "laboratorio", "calidad del agua", "caracterizaci"],
  },
  { value: "consultoria", label: "Consultoría", raices: ["consultor", "estudios", "diseno"] },
  { value: "interventoria", label: "Interventoría", raices: ["interventor"] },
  { value: "suministros", label: "Suministros", raices: ["suministr", "adquisici"] },
];

export function esActividad(v: string): v is ActividadBusqueda {
  return ACTIVIDADES_BUSQUEDA.some((a) => a.value === v);
}

export function esSistema(v: string): v is SistemaBusqueda {
  return (
    (SISTEMAS_AGRUPADOS as readonly string[]).includes(v) ||
    (TIPOS_PROYECTO as readonly string[]).includes(v)
  );
}

export function tiposDeSistema(sistema: SistemaBusqueda): readonly TipoProyecto[] {
  if (sistema === "potable") return [ACUEDUCTO, PTAP];
  if (sistema === "residual") return [ALCANTARILLADO, PTAR];
  return [sistema];
}

/** Patrón fijo PostgreSQL, consumido sobre texto sin tildes y en minúsculas. */
export function patronDeActividad(actividad: ActividadBusqueda): string {
  const opcion = ACTIVIDADES_BUSQUEDA.find((a) => a.value === actividad);
  if (!opcion) throw new Error("Actividad no válida");
  return `(^|[^a-z0-9])(${opcion.raices.join("|")})[a-z]*([^a-z0-9]|$)`;
}
