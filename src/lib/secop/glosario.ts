/**
 * Las palabras de la contratación pública, explicadas en una línea (regla R7 del
 * spec 2026-10-05-ficha-viva-ciclo-de-vida: «Lenguaje simple»).
 *
 * Una sola fuente: la ficha no redacta definiciones sueltas. Cada definición
 * dice qué es la cosa, no qué hacer con ella, y no promete nada que la ficha no
 * compruebe. Puro y sin base: lo usan el servidor y las pruebas.
 */

export const TERMINOS = [
  "secop",
  "expediente",
  "pliego",
  "presupuesto_oficial",
  "modalidad",
  "regimen_especial",
  "unspsc",
  "nit",
  "adjudicacion",
  "requisitos_habilitantes",
  "experiencia_especifica",
  "capacidad_financiera",
  "capacidad_organizacional",
  "causales_rechazo",
  "adenda",
  "estudios_previos",
  "adicion",
  "prorroga",
] as const;
export type Termino = (typeof TERMINOS)[number];

export interface Definicion {
  termino: string;
  definicion: string;
}

export const GLOSARIO: Record<Termino, Definicion> = {
  secop: {
    termino: "SECOP II",
    definicion:
      "La plataforma del Estado colombiano donde las entidades publican sus procesos de contratación. Es la fuente de los datos de esta ficha.",
  },
  expediente: {
    termino: "Expediente",
    definicion:
      "La página del proceso en SECOP II, con todos sus documentos y cambios. Es la versión oficial: ante cualquier duda, manda el expediente.",
  },
  pliego: {
    termino: "Pliego de condiciones",
    definicion:
      "El documento que fija las reglas del proceso: qué se contrata, quién puede presentarse, cómo se evalúa y en qué fechas.",
  },
  presupuesto_oficial: {
    termino: "Presupuesto oficial",
    definicion:
      "Lo máximo que la entidad prevé pagar por el contrato. No es lo que se paga al final ni lo que ya se ha pagado.",
  },
  modalidad: {
    termino: "Modalidad",
    definicion:
      "El procedimiento que usa la entidad para elegir al contratista: licitación, selección abreviada, mínima cuantía, concurso de méritos, contratación directa o régimen especial.",
  },
  regimen_especial: {
    termino: "Régimen especial",
    definicion:
      "Las entidades que contratan con su propio manual y no con la ley general de contratación, como muchas empresas de servicios públicos. Pueden no abrir convocatoria pública.",
  },
  unspsc: {
    termino: "Código UNSPSC",
    definicion:
      "Un código internacional que clasifica lo que se compra (obras, bienes o servicios). Sirve para buscar procesos parecidos.",
  },
  nit: {
    termino: "NIT",
    definicion: "El número de identificación tributaria de una empresa o entidad en Colombia.",
  },
  adjudicacion: {
    termino: "Adjudicación",
    definicion: "La decisión de la entidad de elegir a un oferente. Después se firma el contrato.",
  },
  requisitos_habilitantes: {
    termino: "Requisitos habilitantes",
    definicion:
      "Lo mínimo que una empresa debe cumplir para que su oferta se evalúe: experiencia, capacidad financiera y capacidad organizacional. No dan puntos; si falta uno, la oferta no sigue.",
  },
  experiencia_especifica: {
    termino: "Experiencia específica",
    definicion:
      "Contratos que la empresa ya ejecutó y que se parecen al que se contrata, en objeto y en valor.",
  },
  capacidad_financiera: {
    termino: "Capacidad financiera",
    definicion:
      "Indicadores de la contabilidad de la empresa (liquidez, endeudamiento y otros) que el pliego exige para mostrar que puede sostener el contrato.",
  },
  capacidad_organizacional: {
    termino: "Capacidad organizacional",
    definicion:
      "Indicadores de rentabilidad de la empresa (sobre el patrimonio y sobre el activo) que el pliego exige.",
  },
  causales_rechazo: {
    termino: "Causales de rechazo",
    definicion:
      "Las situaciones en las que la entidad descarta una oferta, por ejemplo si su valor supera el presupuesto oficial.",
  },
  adenda: {
    termino: "Adenda",
    definicion:
      "Un documento que cambia el pliego después de publicado: fechas, requisitos o cantidades. Hay que revisarlas todas antes de ofertar.",
  },
  estudios_previos: {
    termino: "Estudios previos",
    definicion:
      "El documento donde la entidad explica por qué necesita el contrato, cuánto debería costar y cómo lo calculó.",
  },
  adicion: {
    termino: "Adición",
    definicion: "Dinero que se agrega a un contrato ya firmado, sobre su valor inicial.",
  },
  prorroga: {
    termino: "Prórroga",
    definicion: "Tiempo que se agrega a un contrato ya firmado, sobre su fecha de fin inicial.",
  },
};

/** Lo que la ficha sabe de sí misma para decidir qué palabras explicar. */
export interface ContextoGlosario {
  modalidad: string | null;
  tieneUnspsc: boolean;
  tieneNit: boolean;
  conPliego: boolean;
  /** La etapa es adjudicado o posterior. */
  adjudicado: boolean;
  conAdicion: boolean;
  conProrroga: boolean;
}

/**
 * Las palabras que esta ficha usa, en orden de lectura. Solo las que aparecen:
 * un glosario de veinte entradas que no vienen al caso es otra letra pequeña.
 */
export function terminosDeFicha(c: ContextoGlosario): Definicion[] {
  const regimen = /r[eé]gimen especial/i.test(c.modalidad ?? "");
  const lista: (Termino | null)[] = [
    "secop",
    "expediente",
    "presupuesto_oficial",
    "modalidad",
    regimen ? "regimen_especial" : null,
    c.tieneUnspsc ? "unspsc" : null,
    c.tieneNit ? "nit" : null,
    "pliego",
    // La sección del pliego los nombra aunque el pliego no esté procesado:
    // dice qué se desbloquea al subirlo.
    "requisitos_habilitantes",
    c.conPliego ? "experiencia_especifica" : null,
    c.conPliego ? "capacidad_financiera" : null,
    c.conPliego ? "capacidad_organizacional" : null,
    "causales_rechazo",
    "adenda",
    "estudios_previos",
    c.adjudicado ? "adjudicacion" : null,
    c.conAdicion ? "adicion" : null,
    c.conProrroga ? "prorroga" : null,
  ];
  return lista.filter((t): t is Termino => t !== null).map((t) => GLOSARIO[t]);
}
