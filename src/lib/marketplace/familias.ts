/**
 * Las tres familias del hero y sus ilustraciones. Puro y sin base.
 *
 * Las familias son las de `tipo-color.ts` (potable = acueducto + PTAP,
 * residual = PTAR, redes = alcantarillado) y el valor que viaja en la URL es el
 * `tipo` de la vitrina (`busqueda-guiada.ts`): el hero, la vitrina y el mapa no
 * pueden agrupar distinto. «Redes y alcantarillado» ya está verificado: es
 * `tipo=redes` desde el 2026-10-07.
 */

import { COLOR_TIPO, FAMILIAS, type FamiliaTipo } from "../classify/tipo-color";
import { esSistema, type SistemaAgrupado } from "../secop/busqueda-guiada";

export type FamiliaMarketplace = Exclude<FamiliaTipo, "otros">;

export interface Ilustracion {
  /** Ruta pública, variante de 1280 px. */
  src: string;
  /** Variante de 640 px. */
  src640: string;
  ancho: number;
  alto: number;
}

const BASE = "/assets/marketplace/oportunidades";

export const ILUSTRACION: Record<FamiliaMarketplace, Ilustracion> = {
  potable: {
    src: `${BASE}/oportunidad-ptap.webp`,
    src640: `${BASE}/oportunidad-ptap-640.webp`,
    ancho: 1280,
    alto: 800,
  },
  residual: {
    src: `${BASE}/oportunidad-ptar.webp`,
    src640: `${BASE}/oportunidad-ptar-640.webp`,
    ancho: 1280,
    alto: 800,
  },
  redes: {
    src: `${BASE}/oportunidad-redes.webp`,
    src640: `${BASE}/oportunidad-redes-640.webp`,
    ancho: 1280,
    alto: 800,
  },
};

export const FONDO_HERO = {
  escritorio: "/assets/marketplace/hero/hero-atmosphere.webp",
  movil: "/assets/marketplace/hero/hero-atmosphere-mobile.webp",
  transicion: "/assets/marketplace/hero/section-transition.webp",
} as const;

export interface FamiliaChip {
  /** Valor del parámetro `tipo` de la vitrina. */
  sistema: SistemaAgrupado;
  familia: FamiliaMarketplace;
  /** «Agua potable», «Aguas residuales», «Redes y alcantarillado». */
  label: string;
  /** Color sobre el fondo oscuro. */
  color: string;
}

export const FAMILIAS_CHIP: FamiliaChip[] = FAMILIAS.filter(
  (f): f is typeof f & { familia: FamiliaMarketplace } => f.familia !== "otros"
).map((f) => ({ sistema: f.familia, familia: f.familia, label: f.label, color: f.oscuro }));

/** La familia de un tipo de obra, o `null` si no afirma ninguna (`otros`, vacío). */
export function familiaDeTipo(tipo: string | null | undefined): FamiliaMarketplace | null {
  const f = tipo && tipo in COLOR_TIPO ? COLOR_TIPO[tipo as keyof typeof COLOR_TIPO].familia : null;
  return f && f !== "otros" ? f : null;
}

/** La ilustración de una tarjeta; `null` = fondo neutro del componente. */
export function ilustracionDeTipo(tipo: string | null | undefined): Ilustracion | null {
  const f = familiaDeTipo(tipo);
  return f ? ILUSTRACION[f] : null;
}

/** ¿Este valor de `tipo` corresponde a una de las tres familias del hero? */
export function esFamiliaActiva(tipo: string | null | undefined, chip: FamiliaChip): boolean {
  return !!tipo && esSistema(tipo) && tipo === chip.sistema;
}
