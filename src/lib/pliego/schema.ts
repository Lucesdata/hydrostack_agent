/**
 * Esquema de la extracción de un pliego (núcleo de Capa A).
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
 *
 * Grounding (gate de Fase 0, endurecido): todo campo de texto que el modelo no
 * encuentre en el documento debe valer literalmente `"NO_ENCONTRADO"` — nunca
 * vacío ni inventado. Cada ítem de presupuesto y cada hito de cronograma exige
 * su `cita_textual` (máx. ~20 palabras) como prueba de grounding; `validatePliego`
 * marca como sospechoso cualquier valor presente sin cita. La verificación
 * matemática (cantidad×valor_unitario vs valor_total) es responsabilidad del
 * validador TS determinístico, no del modelo — pedirle al LLM que "recalcule"
 * cifras es la fuente de no-determinismo entre corridas.
 */

export const NO_ENCONTRADO = "NO_ENCONTRADO";

export interface PliegoItem {
  /** Código o numeración del ítem tal como aparece en el pliego/formato (p. ej. "1.1.73.1.1"). */
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  valor_unitario: number;
  /** Parcial de la línea = cantidad × valor_unitario (antes de IVA si es global). */
  valor_total: number;
  /** Cita textual (máx. ~20 palabras) que sustenta este ítem en el documento. */
  cita_textual: string;
}

export interface PliegoCapitulo {
  nombre: string;
  items: PliegoItem[];
}

export interface CronogramaHito {
  hito: string;
  fecha: string;
  cita_textual: string;
}

export interface RequisitosHabilitantes {
  /** String o literal `NO_ENCONTRADO` si el pliego no lo declara. */
  experiencia_especifica: string;
  capacidad_financiera: string;
  capacidad_organizacional: string;
}

export type ConfianzaGeneral = "alta" | "media" | "baja";

export interface VerificacionExtraccion {
  /** Nombres de campos (dot-path) que quedaron en NO_ENCONTRADO. */
  campos_no_encontrados: string[];
  confianza_general: ConfianzaGeneral;
  justificacion_confianza: string;
}

export type SeveridadLaguna = "alta" | "media" | "baja";

/** Inconsistencia, ambigüedad o vacío del propio pliego (no un error de extracción). */
export interface LagunaPendiente {
  /** Entero secuencial desde 1, en orden de aparición en el documento. */
  id: number;
  descripcion: string;
  severidad: SeveridadLaguna;
  /** Categoría breve, p. ej. "inconsistencia interna del pliego", "archivo externo no analizado". */
  tipo: string;
}

export interface PliegoExtraction {
  proceso: string;
  entidad: string;
  /** String o literal `NO_ENCONTRADO`. */
  objeto_contrato: string;
  modalidad_contratacion: string;
  fecha_publicacion: string;
  fecha_cierre: string;
  presupuesto_oficial_cop: number;
  moneda: string;
  capitulos: PliegoCapitulo[];
  /** Causales de rechazo y techos relevantes del presupuesto. */
  reglas_presupuesto: string[];
  requisitos_habilitantes: RequisitosHabilitantes;
  cronograma: CronogramaHito[];
  verificacion: VerificacionExtraccion;
  /** Inconsistencias/ambigüedades del propio pliego detectadas durante la lectura. */
  lagunas_pendientes: LagunaPendiente[];
}

/**
 * JSON Schema para `output_config.format`. Structured outputs exige
 * `additionalProperties: false` en cada objeto y todos los campos en `required`.
 * No se usan restricciones numéricas/de longitud (no soportadas por la API).
 */
export const PLIEGO_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    proceso: { type: "string" },
    entidad: { type: "string" },
    objeto_contrato: { type: "string" },
    modalidad_contratacion: { type: "string" },
    fecha_publicacion: { type: "string" },
    fecha_cierre: { type: "string" },
    presupuesto_oficial_cop: { type: "number" },
    moneda: { type: "string" },
    capitulos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          nombre: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                codigo: { type: "string" },
                descripcion: { type: "string" },
                unidad: { type: "string" },
                cantidad: { type: "number" },
                valor_unitario: { type: "number" },
                valor_total: { type: "number" },
                cita_textual: { type: "string" },
              },
              required: [
                "codigo",
                "descripcion",
                "unidad",
                "cantidad",
                "valor_unitario",
                "valor_total",
                "cita_textual",
              ],
            },
          },
        },
        required: ["nombre", "items"],
      },
    },
    reglas_presupuesto: { type: "array", items: { type: "string" } },
    requisitos_habilitantes: {
      type: "object",
      additionalProperties: false,
      properties: {
        experiencia_especifica: { type: "string" },
        capacidad_financiera: { type: "string" },
        capacidad_organizacional: { type: "string" },
      },
      required: ["experiencia_especifica", "capacidad_financiera", "capacidad_organizacional"],
    },
    cronograma: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          hito: { type: "string" },
          fecha: { type: "string" },
          cita_textual: { type: "string" },
        },
        required: ["hito", "fecha", "cita_textual"],
      },
    },
    verificacion: {
      type: "object",
      additionalProperties: false,
      properties: {
        campos_no_encontrados: { type: "array", items: { type: "string" } },
        confianza_general: { type: "string", enum: ["alta", "media", "baja"] },
        justificacion_confianza: { type: "string" },
      },
      required: ["campos_no_encontrados", "confianza_general", "justificacion_confianza"],
    },
    lagunas_pendientes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "number" },
          descripcion: { type: "string" },
          severidad: { type: "string", enum: ["alta", "media", "baja"] },
          tipo: { type: "string" },
        },
        required: ["id", "descripcion", "severidad", "tipo"],
      },
    },
  },
  required: [
    "proceso",
    "entidad",
    "objeto_contrato",
    "modalidad_contratacion",
    "fecha_publicacion",
    "fecha_cierre",
    "presupuesto_oficial_cop",
    "moneda",
    "capitulos",
    "reglas_presupuesto",
    "requisitos_habilitantes",
    "cronograma",
    "verificacion",
    "lagunas_pendientes",
  ],
} as const;

function asString(v: unknown, field: string): string {
  if (typeof v !== "string") throw new Error(`campo ${field} debe ser string`);
  return v;
}

function asNumber(v: unknown, field: string): number {
  if (typeof v !== "number" || Number.isNaN(v)) throw new Error(`campo ${field} debe ser número`);
  return v;
}

/** Valida la forma del JSON recibido y devuelve el tipo fuerte; lanza si no calza. */
export function parsePliegoExtraction(raw: unknown): PliegoExtraction {
  if (typeof raw !== "object" || raw === null) throw new Error("la extracción no es un objeto");
  const o = raw as Record<string, unknown>;

  if (!Array.isArray(o.capitulos)) throw new Error("capitulos debe ser un array");
  const capitulos: PliegoCapitulo[] = o.capitulos.map((c, i) => {
    if (typeof c !== "object" || c === null) throw new Error(`capítulo ${i} inválido`);
    const cc = c as Record<string, unknown>;
    if (!Array.isArray(cc.items)) throw new Error(`capitulos[${i}].items debe ser un array`);
    return {
      nombre: asString(cc.nombre, `capitulos[${i}].nombre`),
      items: cc.items.map((it, j) => {
        if (typeof it !== "object" || it === null) throw new Error(`ítem ${i}.${j} inválido`);
        const ii = it as Record<string, unknown>;
        const loc = `capitulos[${i}].items[${j}]`;
        return {
          codigo: asString(ii.codigo, `${loc}.codigo`),
          descripcion: asString(ii.descripcion, `${loc}.descripcion`),
          unidad: asString(ii.unidad, `${loc}.unidad`),
          cantidad: asNumber(ii.cantidad, `${loc}.cantidad`),
          valor_unitario: asNumber(ii.valor_unitario, `${loc}.valor_unitario`),
          valor_total: asNumber(ii.valor_total, `${loc}.valor_total`),
          cita_textual: asString(ii.cita_textual, `${loc}.cita_textual`),
        };
      }),
    };
  });

  if (!Array.isArray(o.reglas_presupuesto)) throw new Error("reglas_presupuesto debe ser un array");
  if (!Array.isArray(o.cronograma)) throw new Error("cronograma debe ser un array");
  const cronograma: CronogramaHito[] = o.cronograma.map((h, i) => {
    if (typeof h !== "object" || h === null) throw new Error(`cronograma[${i}] inválido`);
    const hh = h as Record<string, unknown>;
    return {
      hito: asString(hh.hito, `cronograma[${i}].hito`),
      fecha: asString(hh.fecha, `cronograma[${i}].fecha`),
      cita_textual: asString(hh.cita_textual, `cronograma[${i}].cita_textual`),
    };
  });

  if (typeof o.requisitos_habilitantes !== "object" || o.requisitos_habilitantes === null) {
    throw new Error("requisitos_habilitantes debe ser un objeto");
  }
  const rh = o.requisitos_habilitantes as Record<string, unknown>;
  const requisitos_habilitantes: RequisitosHabilitantes = {
    experiencia_especifica: asString(
      rh.experiencia_especifica,
      "requisitos_habilitantes.experiencia_especifica"
    ),
    capacidad_financiera: asString(
      rh.capacidad_financiera,
      "requisitos_habilitantes.capacidad_financiera"
    ),
    capacidad_organizacional: asString(
      rh.capacidad_organizacional,
      "requisitos_habilitantes.capacidad_organizacional"
    ),
  };

  if (typeof o.verificacion !== "object" || o.verificacion === null) {
    throw new Error("verificacion debe ser un objeto");
  }
  const v = o.verificacion as Record<string, unknown>;
  if (!Array.isArray(v.campos_no_encontrados)) {
    throw new Error("verificacion.campos_no_encontrados debe ser un array");
  }
  const confianza_general = asString(v.confianza_general, "verificacion.confianza_general");
  if (
    confianza_general !== "alta" &&
    confianza_general !== "media" &&
    confianza_general !== "baja"
  ) {
    throw new Error("verificacion.confianza_general debe ser alta | media | baja");
  }
  const verificacion: VerificacionExtraccion = {
    campos_no_encontrados: v.campos_no_encontrados.map((c, i) =>
      asString(c, `verificacion.campos_no_encontrados[${i}]`)
    ),
    confianza_general,
    justificacion_confianza: asString(
      v.justificacion_confianza,
      "verificacion.justificacion_confianza"
    ),
  };

  if (!Array.isArray(o.lagunas_pendientes)) throw new Error("lagunas_pendientes debe ser un array");
  const lagunas_pendientes: LagunaPendiente[] = o.lagunas_pendientes.map((l, i) => {
    if (typeof l !== "object" || l === null) throw new Error(`lagunas_pendientes[${i}] inválido`);
    const ll = l as Record<string, unknown>;
    const loc = `lagunas_pendientes[${i}]`;
    const severidad = asString(ll.severidad, `${loc}.severidad`);
    if (severidad !== "alta" && severidad !== "media" && severidad !== "baja") {
      throw new Error(`${loc}.severidad debe ser alta | media | baja`);
    }
    return {
      id: asNumber(ll.id, `${loc}.id`),
      descripcion: asString(ll.descripcion, `${loc}.descripcion`),
      severidad,
      tipo: asString(ll.tipo, `${loc}.tipo`),
    };
  });

  return {
    proceso: asString(o.proceso, "proceso"),
    entidad: asString(o.entidad, "entidad"),
    objeto_contrato: asString(o.objeto_contrato, "objeto_contrato"),
    modalidad_contratacion: asString(o.modalidad_contratacion, "modalidad_contratacion"),
    fecha_publicacion: asString(o.fecha_publicacion, "fecha_publicacion"),
    fecha_cierre: asString(o.fecha_cierre, "fecha_cierre"),
    presupuesto_oficial_cop: asNumber(o.presupuesto_oficial_cop, "presupuesto_oficial_cop"),
    moneda: asString(o.moneda, "moneda"),
    capitulos,
    reglas_presupuesto: o.reglas_presupuesto.map((r, i) => asString(r, `reglas_presupuesto[${i}]`)),
    requisitos_habilitantes,
    cronograma,
    verificacion,
    lagunas_pendientes,
  };
}
