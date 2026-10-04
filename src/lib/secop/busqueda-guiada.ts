import { TIPOS_PROYECTO, TIPO_PROYECTO, type TipoProyecto } from "../classify/tipo-proyecto";
import type { SecopQuery } from "./types";

const [ACUEDUCTO, ALCANTARILLADO, PTAP, PTAR] = TIPOS_PROYECTO;
const tiposVisibles = [ACUEDUCTO, ALCANTARILLADO, PTAP, PTAR];

export type SistemaBusqueda = "potable" | "residual" | TipoProyecto;
export type ActividadBusqueda =
  "obras" | "operacion" | "muestreo" | "consultoria" | "interventoria" | "suministros";

export const SISTEMAS_BUSQUEDA: { value: SistemaBusqueda; label: string }[] = [
  { value: "potable", label: "Agua potable" },
  { value: "residual", label: "Aguas residuales" },
  ...tiposVisibles.map((value) => ({ value, label: TIPO_PROYECTO[value].label })),
];

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

export class ConsultaGuiadaInvalida extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConsultaGuiadaInvalida";
  }
}

export function tiposDeSistema(sistema: SistemaBusqueda): readonly TipoProyecto[] {
  if (sistema === "potable") return [ACUEDUCTO, PTAP];
  if (sistema === "residual") return [ALCANTARILLADO, PTAR];
  return [sistema];
}

/** Patrón fijo PostgreSQL, consumido sobre texto sin tildes y en minúsculas. */
export function patronDeActividad(actividad: ActividadBusqueda): string {
  const opcion = ACTIVIDADES_BUSQUEDA.find((a) => a.value === actividad);
  if (!opcion) throw new ConsultaGuiadaInvalida("Actividad no válida");
  return `(^|[^a-z0-9])(${opcion.raices.join("|")})[a-z]*([^a-z0-9]|$)`;
}

export function validarConsultaGuiada(query: SecopQuery): void {
  if (query.modo === undefined) {
    if (query.sistema || query.actividad || query.numero !== undefined) {
      throw new ConsultaGuiadaInvalida("La consulta guiada requiere un modo");
    }
    return;
  }
  if (query.modo !== "tema" && query.modo !== "numero") {
    throw new ConsultaGuiadaInvalida("Modo de búsqueda no válido");
  }
  if (query.sistema && !SISTEMAS_BUSQUEDA.some((s) => s.value === query.sistema)) {
    throw new ConsultaGuiadaInvalida("Sistema no válido");
  }
  if (query.actividad && !ACTIVIDADES_BUSQUEDA.some((a) => a.value === query.actividad)) {
    throw new ConsultaGuiadaInvalida("Actividad no válida");
  }
  if (query.modo === "numero") {
    if (!query.numero?.trim() || query.numero.length > 120) {
      throw new ConsultaGuiadaInvalida("Escribe un número de proceso de hasta 120 caracteres");
    }
    if (query.sistema || query.actividad || query.q?.trim()) {
      throw new ConsultaGuiadaInvalida("La búsqueda por número no se combina con temas o palabras");
    }
  } else if (query.numero !== undefined) {
    throw new ConsultaGuiadaInvalida("El número requiere el modo de búsqueda por número");
  }
  if (query.q && query.q.length > 120) {
    throw new ConsultaGuiadaInvalida("El texto de búsqueda admite hasta 120 caracteres");
  }
  for (const value of [query.page, query.pageSize]) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) {
      throw new ConsultaGuiadaInvalida("La página y su tamaño deben ser enteros positivos");
    }
  }
  if (query.page !== undefined && query.page > 1_000_000) {
    throw new ConsultaGuiadaInvalida("Página fuera de rango");
  }
  if (query.valorMin !== undefined && (!Number.isFinite(query.valorMin) || query.valorMin < 0)) {
    throw new ConsultaGuiadaInvalida("El presupuesto mínimo debe ser un número no negativo");
  }
  if (query.desde) {
    const fecha = new Date(`${query.desde}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(query.desde) ||
      !Number.isFinite(fecha.getTime()) ||
      fecha.toISOString().slice(0, 10) !== query.desde
    ) {
      throw new ConsultaGuiadaInvalida("La fecha debe ser válida y tener formato AAAA-MM-DD");
    }
  }
}

export function parseBusquedaGuiada(sp: URLSearchParams): Partial<SecopQuery> {
  if (!["modo", "sistema", "actividad", "numero"].some((key) => sp.has(key))) return {};
  return {
    modo: (sp.get("modo") ?? (sp.has("numero") ? "numero" : "tema")) as SecopQuery["modo"],
    sistema: (sp.get("sistema") || undefined) as SistemaBusqueda | undefined,
    actividad: (sp.get("actividad") || undefined) as ActividadBusqueda | undefined,
    numero: sp.has("numero") ? sp.get("numero")!.trim() : undefined,
    soloAgua: false,
  };
}
