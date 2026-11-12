/**
 * Contrato de vista del marketplace (SPEC Fase 4 §4). Solo tipos: sin base,
 * para que servidor, componentes cliente y pruebas compartan la misma forma.
 *
 * Todo es serializable (el servidor entrega estos DTO a los componentes
 * cliente): importes como cadena decimal y fechas como `AAAA-MM-DD` o ISO.
 */

export interface Oportunidad {
  /** `id_del_proceso` de SECOP II (CO1.REQ.…). La referencia puede repetirse. */
  id: string;
  referencia: string | null;
  objeto: string;
  entidad: string | null;
  departamentoCodigo: string | null;
  departamento: string | null;
  municipio: string | null;
  /** Uno de los cinco tipos de AquaLicita; `null` = sin tipo confirmado. */
  tipo: string | null;
  estado: string | null;
  estadoApertura: string | null;
  /** Solo la búsqueda por número la trae: cerrados y contratados salen rotulados. */
  etapaCalculada: string | null;
  /** `precio_base`, decimal en COP como texto. `null` = no publicado (el 0 no cuenta). */
  precioBaseCop: string | null;
  fechaPublicacion: string | null;
  fechaRecepcion: string | null;
  /** Ficha canónica `/licitaciones/[slug]`. */
  fichaHref: string;
  /** Detalle en SECOP II, solo si la URL pasa el validador del repo. */
  secopHref: string | null;
}

export interface Region {
  /** DIVIPOLA de dos dígitos, como cadena: «05», no 5. */
  codigo: string;
  nombre: string;
  slug: string;
  total: number;
}

export interface Metricas {
  abiertas: number;
  /** Entidades distintas entre las oportunidades. `null` si no se pudo contar. */
  entidades: number | null;
  /** Suma de `precio_base` (una vez por proceso), decimal como texto. */
  valorEstimadoCop: string | null;
  /** Cuántas de las `abiertas` publican precio base: la cobertura de la suma. */
  procesosConValor: number | null;
}

export interface RegionSeleccionada {
  codigo: string;
  nombre: string;
  slug: string;
}

export interface ConsultaDisponible {
  estado: "disponible" | "desactualizado";
  consultadoEn: string;
  /** Marca de frescura de la ingesta (`max(updated_at)`), o `null` si no hay. */
  actualizadoEn: string | null;
  /** Total de la consulta completa, nunca el tamaño de la página. */
  total: number;
  items: Oportunidad[];
  /** Con todos los filtros salvo el territorial: sirve para cambiar de región. */
  porDepartamento: Region[];
  /** Procesos de la consulta sin departamento resuelto (no caben en el mapa). */
  sinUbicacion: number;
  /** `null` en la búsqueda por número (tiene otro alcance). */
  metricas: Metricas | null;
  departamentoSeleccionado: RegionSeleccionada | null;
  /** El slug de la URL no corresponde a ningún departamento. */
  departamentoInvalido: boolean;
}

export type ConsultaMarketplace =
  ConsultaDisponible | { estado: "no-disponible"; consultadoEn: string };

export const POR_PAGINA_MARKETPLACE = 12;
