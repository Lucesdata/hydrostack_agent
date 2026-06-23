/**
 * Esquema de la extracción de presupuesto de un pliego (núcleo de Capa A).
 *
 * Dos representaciones del mismo contrato:
 *   · `PLIEGO_JSON_SCHEMA` — JSON Schema que se pasa a `output_config.format`
 *     para que la API de Anthropic CONSTRIÑA la salida del modelo a esta forma
 *     (sin líneas con campos faltantes, sin tipos equivocados).
 *   · `parsePliegoExtraction` — guard estructural en runtime: re-valida la forma
 *     del JSON recibido y devuelve el tipo fuerte. Red de seguridad por si la
 *     salida estructurada fallara.
 *
 * Deliberadamente sin zod: el repo evita deps externas y la API ya garantiza el
 * esquema; este parser puro basta y es trivialmente testeable.
 */

export interface PliegoItem {
  descripcion: string;
  unidad: string;
  cantidad: number;
  valor_unitario: number;
  /** Parcial de la línea = cantidad × valor_unitario (antes de IVA si es global). */
  valor_total: number;
}

export interface PliegoCapitulo {
  nombre: string;
  items: PliegoItem[];
}

export interface PliegoExtraction {
  proceso: string;
  entidad: string;
  presupuesto_oficial_cop: number;
  moneda: string;
  capitulos: PliegoCapitulo[];
  /** Causales de rechazo y techos relevantes del presupuesto. */
  reglas_presupuesto: string[];
}

/**
 * JSON Schema para `output_config.format`. Structured outputs exige
 * `additionalProperties: false` en cada objeto y todos los campos en `required`.
 * No se usan restricciones numéricas/de longitud (no soportadas por la API).
 */
export const PLIEGO_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    proceso: { type: 'string' },
    entidad: { type: 'string' },
    presupuesto_oficial_cop: { type: 'number' },
    moneda: { type: 'string' },
    capitulos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          nombre: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                descripcion: { type: 'string' },
                unidad: { type: 'string' },
                cantidad: { type: 'number' },
                valor_unitario: { type: 'number' },
                valor_total: { type: 'number' },
              },
              required: ['descripcion', 'unidad', 'cantidad', 'valor_unitario', 'valor_total'],
            },
          },
        },
        required: ['nombre', 'items'],
      },
    },
    reglas_presupuesto: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'proceso',
    'entidad',
    'presupuesto_oficial_cop',
    'moneda',
    'capitulos',
    'reglas_presupuesto',
  ],
} as const;

function asString(v: unknown, field: string): string {
  if (typeof v !== 'string') throw new Error(`campo ${field} debe ser string`);
  return v;
}

function asNumber(v: unknown, field: string): number {
  if (typeof v !== 'number' || Number.isNaN(v)) throw new Error(`campo ${field} debe ser número`);
  return v;
}

/** Valida la forma del JSON recibido y devuelve el tipo fuerte; lanza si no calza. */
export function parsePliegoExtraction(raw: unknown): PliegoExtraction {
  if (typeof raw !== 'object' || raw === null) throw new Error('la extracción no es un objeto');
  const o = raw as Record<string, unknown>;

  if (!Array.isArray(o.capitulos)) throw new Error('capitulos debe ser un array');
  const capitulos: PliegoCapitulo[] = o.capitulos.map((c, i) => {
    if (typeof c !== 'object' || c === null) throw new Error(`capítulo ${i} inválido`);
    const cc = c as Record<string, unknown>;
    if (!Array.isArray(cc.items)) throw new Error(`capitulos[${i}].items debe ser un array`);
    return {
      nombre: asString(cc.nombre, `capitulos[${i}].nombre`),
      items: cc.items.map((it, j) => {
        if (typeof it !== 'object' || it === null) throw new Error(`ítem ${i}.${j} inválido`);
        const ii = it as Record<string, unknown>;
        const loc = `capitulos[${i}].items[${j}]`;
        return {
          descripcion: asString(ii.descripcion, `${loc}.descripcion`),
          unidad: asString(ii.unidad, `${loc}.unidad`),
          cantidad: asNumber(ii.cantidad, `${loc}.cantidad`),
          valor_unitario: asNumber(ii.valor_unitario, `${loc}.valor_unitario`),
          valor_total: asNumber(ii.valor_total, `${loc}.valor_total`),
        };
      }),
    };
  });

  if (!Array.isArray(o.reglas_presupuesto)) throw new Error('reglas_presupuesto debe ser un array');

  return {
    proceso: asString(o.proceso, 'proceso'),
    entidad: asString(o.entidad, 'entidad'),
    presupuesto_oficial_cop: asNumber(o.presupuesto_oficial_cop, 'presupuesto_oficial_cop'),
    moneda: asString(o.moneda, 'moneda'),
    capitulos,
    reglas_presupuesto: o.reglas_presupuesto.map((r, i) => asString(r, `reglas_presupuesto[${i}]`)),
  };
}
