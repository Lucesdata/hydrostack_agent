/**
 * Los criterios del antiguo buscador guiado (#109) que sobreviven a la
 * unificación del 2026-10-05: agrupar tipos de obra por sistema y filtrar por
 * actividad. Desde entonces los usa la vitrina (`filtros-vitrina.ts`,
 * `vitrina.ts`), que es el único buscador; el explorador guiado y `/api/secop`
 * salieron.
 *
 * Puro: sin base.
 */

import { COLOR_TIPO } from "../classify/tipo-color";
import { TIPOS_PROYECTO, TIPO_PROYECTO, type TipoProyecto } from "../classify/tipo-proyecto";

/**
 * Los tres sistemas que agrupan tipos de obra, además de cada tipo suelto. Son
 * las familias de `tipo-color.ts` —las mismas del color del mapa, la leyenda y
 * las pestañas del hero—: potable = acueducto + PTAP, residual = PTAR, redes =
 * alcantarillado. Hasta el 2026-10-07 «residual» incluía el alcantarillado y no
 * había «redes»: el hero decía «Redes» de un proceso que la vitrina contaba como
 * residual (spec 2026-10-07-hero-tres-destacados, D1).
 */
export const SISTEMAS_AGRUPADOS = ["potable", "residual", "redes"] as const;
export type SistemaAgrupado = (typeof SISTEMAS_AGRUPADOS)[number];
export type SistemaBusqueda = SistemaAgrupado | TipoProyecto;

function tiposDeFamilia(familia: SistemaAgrupado): TipoProyecto[] {
  return TIPOS_PROYECTO.filter((t) => COLOR_TIPO[t].familia === familia);
}

/**
 * «Agua potable (Acueducto y PTAP)»: el nombre de la familia y lo que agrupa.
 * Sin paréntesis si el nombre ya lo dice: «Redes y alcantarillado», no
 * «Redes y alcantarillado (Alcantarillado)».
 */
export const ETIQUETA_SISTEMA = Object.fromEntries(
  SISTEMAS_AGRUPADOS.map((s) => {
    const tipos = tiposDeFamilia(s).map((t) => TIPO_PROYECTO[t].label);
    const nombre = COLOR_TIPO[tiposDeFamilia(s)[0]].familiaLabel;
    const dicho = tipos.every((t) => nombre.toLowerCase().includes(t.toLowerCase()));
    return [s, dicho ? nombre : `${nombre} (${tipos.join(" y ")})`];
  })
) as Record<SistemaAgrupado, string>;

/** Para el `<select>` de la vitrina, que es estrecho; la pastilla lleva la larga. */
export const ETIQUETA_SISTEMA_CORTA = Object.fromEntries(
  SISTEMAS_AGRUPADOS.map((s) => [s, COLOR_TIPO[tiposDeFamilia(s)[0]].familiaLabel])
) as Record<SistemaAgrupado, string>;

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
  if ((SISTEMAS_AGRUPADOS as readonly string[]).includes(sistema)) {
    return tiposDeFamilia(sistema as SistemaAgrupado);
  }
  return [sistema as TipoProyecto];
}

/** Patrón fijo PostgreSQL, consumido sobre texto sin tildes y en minúsculas. */
export function patronDeActividad(actividad: ActividadBusqueda): string {
  const opcion = ACTIVIDADES_BUSQUEDA.find((a) => a.value === actividad);
  if (!opcion) throw new Error("Actividad no válida");
  return `(^|[^a-z0-9])(${opcion.raices.join("|")})[a-z]*([^a-z0-9]|$)`;
}
