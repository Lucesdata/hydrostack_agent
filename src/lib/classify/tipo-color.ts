import { TIPOS_PROYECTO, type TipoProyecto } from "./tipo-proyecto";

/**
 * El color de cada tipo de proyecto. Es presentación, no clasificación: el
 * valor del tipo sigue saliendo de `TIPOS_PROYECTO`, y esto solo le pone cara.
 *
 * Decidido para la Ficha Viva (2026-09-26): **azul** para agua potable,
 * **marrón** para tratamiento de aguas residuales, **gris** para redes y
 * alcantarillado. `acueducto` va con el azul porque su objeto es el suministro
 * de agua potable, aunque buena parte sean tuberías; `otros` no lleva color de
 * familia —un contorno punteado— porque no afirma ningún subsistema.
 *
 * Reglas que no se rompen:
 * 1. **El color nunca va solo**: siempre con `label` o `familia` escritos al lado.
 * 2. **Color = tipo de obra; nunca estado ni riesgo.** El semáforo de la ficha
 *    usa verde/ámbar/rojo y no se mezcla con esto.
 * 3. Cada color se mide: `tipo-color.test.ts` exige 3:1 contra el fondo en que
 *    se pinta (WCAG 1.4.11, componentes no textuales).
 */

export type FamiliaTipo = "potable" | "residual" | "redes" | "otros";

export interface ColorTipo {
  familia: FamiliaTipo;
  /** Nombre de la familia, para la leyenda. */
  familiaLabel: string;
  /** Sobre fondo claro (`--bg`, `--surface`). */
  claro: string;
  /** Sobre el panel oscuro del hero. */
  oscuro: string;
}

const FAMILIA: Record<FamiliaTipo, Omit<ColorTipo, "familia">> = {
  potable: { familiaLabel: "Agua potable", claro: "#0369A1", oscuro: "#4CC9FF" },
  residual: { familiaLabel: "Aguas residuales", claro: "#8A5A2B", oscuro: "#D39A62" },
  redes: { familiaLabel: "Redes y alcantarillado", claro: "#5B6776", oscuro: "#A3B1C2" },
  otros: { familiaLabel: "Sin subsistema identificado", claro: "#78716C", oscuro: "#8C99A6" },
};

const FAMILIA_DE: Record<TipoProyecto, FamiliaTipo> = {
  acueducto: "potable",
  ptap: "potable",
  ptar: "residual",
  alcantarillado: "redes",
  otros: "otros",
};

export const COLOR_TIPO: Record<TipoProyecto, ColorTipo> = Object.fromEntries(
  TIPOS_PROYECTO.map((t) => [t, { familia: FAMILIA_DE[t], ...FAMILIA[FAMILIA_DE[t]] }])
) as Record<TipoProyecto, ColorTipo>;

/** Las familias en orden de leyenda, sin repetir. */
export const FAMILIAS: { familia: FamiliaTipo; label: string; claro: string; oscuro: string }[] = (
  ["potable", "residual", "redes", "otros"] as FamiliaTipo[]
).map((f) => ({ familia: f, label: FAMILIA[f].familiaLabel, ...FAMILIA[f] }));

/** `null` para claves que no son un tipo: no se inventa color. */
export function colorDeTipo(tipo: string | null | undefined): ColorTipo | null {
  return tipo && tipo in COLOR_TIPO ? COLOR_TIPO[tipo as TipoProyecto] : null;
}
