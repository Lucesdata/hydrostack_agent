/**
 * La etapa de un proceso: una sola respuesta a «¿en qué va?», calculada con una
 * regla escrita en vez de copiar el estado del SECOP (spec
 * 2026-10-05-ficha-viva-ciclo-de-vida, «El ciclo de vida que muestra la ficha»).
 *
 * Puro y sin base: la regla se prueba sin Postgres y la puede usar cualquier
 * vista. Las mediciones de la base viva que la justifican están en el spec:
 *
 * - La **fase** no se usa: el 87 % de los procesos dice «Presentación de oferta»,
 *   también los 37.000 que ya tienen contrato (M2b).
 * - El **contrato manda** sobre la adjudicación: 36.966 procesos tienen contrato
 *   y solo 13.852 figuran adjudicados (M2c).
 * - «Recibe ofertas» exige una **fecha de recepción vigente** (M9), la misma
 *   regla de `condicionAbierto()` (`recibeOfertas()`).
 * - Un contrato sin firma (Borrador, enviado Proveedor, En aprobación) no cuenta
 *   como contratado, y uno Cancelado no cuenta (M2d).
 * - «En ejecución» y «Plazo cumplido» salen de las **fechas del contrato**: la
 *   fuente no publica el avance de la obra. La etapa final se llama «Plazo
 *   cumplido» aunque el SECOP diga «terminado» (decisión del usuario).
 */

import { diaEnColombia, ESTADOS_ABIERTO, recibeOfertas } from "./estados-abierto";

export type Etapa =
  | "recibe_ofertas"
  | "en_evaluacion"
  | "adjudicado"
  | "contratado"
  | "en_ejecucion"
  | "plazo_cumplido"
  | "no_se_llevo_a_cabo"
  | "por_verificar";

export const NOMBRE_ETAPA: Record<Etapa, string> = {
  recibe_ofertas: "Recibe ofertas",
  en_evaluacion: "En evaluación",
  adjudicado: "Adjudicado",
  contratado: "Contratado",
  en_ejecucion: "En ejecución",
  plazo_cumplido: "Plazo cumplido",
  no_se_llevo_a_cabo: "No se llevó a cabo",
  por_verificar: "Por verificar",
};

/** Un contrato del proceso, con las fechas como `AAAA-MM-DD` (columnas DATE). */
export interface ContratoSenal {
  fechaFirma: string | null;
  fechaInicio: string | null;
  fechaFinInicial: string | null;
  fechaFinActual: string | null;
  valorInicial: string | number | null;
  valorActual: string | number | null;
  /** `contrato.estado_actual` tal como lo publica la fuente. */
  estado: string | null;
}

export interface SenalesProceso {
  estadoActual: string | null;
  estadoApertura: string | null;
  fechaPublicacion: string | null;
  fechaRecepcion: string | null;
  valorEstimado: string | number | null;
  adjudicado: boolean | null;
  adjudicatario: string | null;
  fechaAdjudicacion: string | null;
  contratos: ContratoSenal[];
}

export type CodigoContradiccion = "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7";

export interface Contradiccion {
  codigo: CodigoContradiccion;
  /** La frase para «Revisa antes de confiar», con los dos lados del dato. */
  texto: string;
}

export interface EtapaProceso {
  etapa: Etapa;
  nombre: string;
  /** Una línea que explica de dónde sale la etapa. Nunca afirma avance de obra. */
  linea: string;
  /** El contrato que sostiene la etapa, si lo hay (el de firma más reciente). */
  contrato: ContratoSenal | null;
  contradicciones: Contradiccion[];
}

/** Estados de contrato que todavía no son un contrato firmado (M2d). */
const CONTRATO_SIN_FIRMAR = /^(borrador|enviado proveedor|en aprobaci[oó]n)$/i;
const CANCELADO = /cancel|desiert|revoc/i;
const TERMINADO = /^(terminado|cerrado)$/i;

/** Razón contrato/presupuesto a partir de la cual el valor es un error de captura (M8). */
const RAZON_CIFRA_DUDOSA = 10;

const dia = (iso: string | null | undefined): string | null =>
  iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : null;

const numero = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** «24 nov 2023»: el día de calendario, sin pasar por zonas horarias. */
export function fechaLegible(iso: string | null | undefined): string | null {
  const d = dia(iso);
  if (!d) return null;
  const [a, m, di] = d.split("-").map(Number);
  if (!a || !m || !di || m > 12) return null;
  return `${di} ${MESES[m - 1]} ${a}`;
}

function pesos(n: number): string {
  return `$${Math.round(n).toLocaleString("es-CO")}`;
}

/** Un contrato cuenta como firmado si tiene fecha de firma y no está cancelado ni sin firmar. */
function firmado(c: ContratoSenal): boolean {
  if (!dia(c.fechaFirma)) return false;
  const estado = c.estado?.trim() ?? "";
  return !CONTRATO_SIN_FIRMAR.test(estado) && !CANCELADO.test(estado);
}

function contratoPrincipal(contratos: ContratoSenal[]): ContratoSenal | null {
  const validos = contratos.filter(firmado);
  if (validos.length === 0) return null;
  return [...validos].sort((a, b) =>
    (dia(b.fechaFirma) ?? "").localeCompare(dia(a.fechaFirma) ?? "")
  )[0];
}

function contradiccionesDe(
  s: SenalesProceso,
  contrato: ContratoSenal | null,
  hoy: string
): Contradiccion[] {
  const out: Contradiccion[] = [];
  const estado = s.estadoActual?.trim() ?? null;
  const publicadoOAbierto = !!estado && (ESTADOS_ABIERTO as readonly string[]).includes(estado);
  const aperturaAbiertaONula = s.estadoApertura === "Abierto" || !s.estadoApertura;
  const firma = dia(contrato?.fechaFirma);

  // C1 · el SECOP lo muestra abierto, pero ya hay contrato o adjudicación.
  if (publicadoOAbierto && aperturaAbiertaONula && (firma || s.adjudicado)) {
    out.push({
      codigo: "C1",
      texto: firma
        ? `El SECOP lo muestra como «${estado}», pero ya hay un contrato firmado el ${fechaLegible(firma)}.`
        : `El SECOP lo muestra como «${estado}», pero figura como adjudicado.`,
    });
  }

  // C2 · contrato firmado antes de publicarse el proceso.
  const publicacion = dia(s.fechaPublicacion);
  if (firma && publicacion && firma < publicacion) {
    out.push({
      codigo: "C2",
      texto: `El contrato se firmó el ${fechaLegible(firma)}, antes de publicarse el proceso (${fechaLegible(publicacion)}).`,
    });
  }

  // C3 · figura abierto con la recepción ya vencida.
  const recepcion = dia(s.fechaRecepcion);
  if (s.estadoApertura === "Abierto" && recepcion && recepcion < hoy && !firma) {
    out.push({
      codigo: "C3",
      texto: `Figura abierto, pero la recepción de ofertas venció el ${fechaLegible(recepcion)}.`,
    });
  }

  // C4 · cifra dudosa: el contrato vale más de 10 veces el presupuesto (M8).
  const presupuesto = numero(s.valorEstimado);
  const valorContrato = numero(contrato?.valorActual) ?? numero(contrato?.valorInicial);
  if (presupuesto && valorContrato && valorContrato > presupuesto * RAZON_CIFRA_DUDOSA) {
    const veces = Math.round(valorContrato / presupuesto);
    out.push({
      codigo: "C4",
      texto: `El valor del contrato publicado (${pesos(valorContrato)}) parece un error de la fuente: es ${veces.toLocaleString("es-CO")} veces el presupuesto (${pesos(presupuesto)}). Compruébalo en el expediente.`,
    });
  }

  // C5 · cancelado, desierto o revocado, pero con contrato firmado.
  if (estado && CANCELADO.test(estado) && firma) {
    out.push({
      codigo: "C5",
      texto: `Figura como «${estado}», pero tiene un contrato firmado el ${fechaLegible(firma)}.`,
    });
  }

  // C6 · adjudicado sin adjudicatario publicado.
  if (s.adjudicado && !s.adjudicatario?.trim()) {
    out.push({
      codigo: "C6",
      texto: "Figura como adjudicado, pero el SECOP no publica a quién.",
    });
  }

  // C7 · fin del contrato antes de su inicio.
  const inicio = dia(contrato?.fechaInicio);
  const fin = dia(contrato?.fechaFinActual) ?? dia(contrato?.fechaFinInicial);
  if (inicio && fin && fin < inicio) {
    out.push({
      codigo: "C7",
      texto: `Las fechas del contrato no son coherentes: termina el ${fechaLegible(fin)}, antes de empezar el ${fechaLegible(inicio)}.`,
    });
  }

  return out;
}

const NOTA_EJECUCION = "El SECOP no publica el avance de la obra.";

/**
 * La regla de precedencia del spec, de la señal más fuerte a la más débil:
 * cancelación (salvo contrato firmado) > contrato firmado y sus fechas >
 * adjudicación o selección > recepción de ofertas > estado del proceso.
 */
export function etapaDeProceso(s: SenalesProceso, ahora: Date = new Date()): EtapaProceso {
  const hoy = diaEnColombia(ahora);
  const contrato = contratoPrincipal(s.contratos);
  const contradicciones = contradiccionesDe(s, contrato, hoy);
  const estado = s.estadoActual?.trim() ?? "";
  const hecho = (etapa: Etapa, linea: string): EtapaProceso => ({
    etapa,
    nombre: NOMBRE_ETAPA[etapa],
    linea,
    contrato,
    contradicciones,
  });

  // 1 · Cancelado, desierto o revocado. Con contrato firmado es C5: por verificar.
  if (CANCELADO.test(estado)) {
    if (contrato) {
      return hecho(
        "por_verificar",
        `El SECOP lo marca como «${estado}», pero tiene un contrato firmado. Confírmalo en el expediente.`
      );
    }
    return hecho("no_se_llevo_a_cabo", `El SECOP lo marca como «${estado}».`);
  }

  // 2 · Contrato firmado: sus fechas dicen la etapa.
  if (contrato) {
    const firma = fechaLegible(contrato.fechaFirma);
    const inicio = dia(contrato.fechaInicio);
    const fin = dia(contrato.fechaFinActual) ?? dia(contrato.fechaFinInicial);
    const estadoContrato = contrato.estado?.trim() ?? "";
    const marca = TERMINADO.test(estadoContrato)
      ? ` El SECOP marca el contrato como «${estadoContrato}».`
      : /suspendid/i.test(estadoContrato)
        ? " El SECOP marca el contrato como suspendido."
        : "";
    if (!inicio) {
      return hecho(
        "contratado",
        `Contrato firmado el ${firma}. El SECOP no publica la fecha de inicio.${marca}`
      );
    }
    if (inicio > hoy) {
      return hecho(
        "contratado",
        `Contrato firmado el ${firma}; según sus fechas empieza el ${fechaLegible(inicio)}.${marca}`
      );
    }
    if (!fin || fin >= hoy) {
      const hasta = fin ? ` al ${fechaLegible(fin)}` : "";
      return hecho(
        "en_ejecucion",
        `Según las fechas del contrato (del ${fechaLegible(inicio)}${hasta}). ${NOTA_EJECUCION}${marca}`
      );
    }
    return hecho(
      "plazo_cumplido",
      `El plazo del contrato terminó el ${fechaLegible(fin)}. No significa que la obra se haya entregado. ${NOTA_EJECUCION}${marca}`
    );
  }

  // 3 · Adjudicado, o con contratista ya seleccionado (M7b: «Seleccionado» es,
  //     en la práctica, contratado).
  if (s.adjudicado) {
    const cuando = fechaLegible(s.fechaAdjudicacion);
    return hecho(
      "adjudicado",
      cuando
        ? `Adjudicado el ${cuando}. No hay contrato firmado publicado todavía.`
        : "Figura como adjudicado. No hay contrato firmado publicado todavía."
    );
  }
  if (/^seleccionado$/i.test(estado)) {
    return hecho(
      "adjudicado",
      "La entidad ya seleccionó al contratista. No hay contrato firmado publicado todavía."
    );
  }

  // 4 · Recepción de ofertas: solo con fecha vigente.
  if (
    recibeOfertas(
      {
        estadoApertura: s.estadoApertura,
        estadoActual: s.estadoActual,
        fechaRecepcion: s.fechaRecepcion,
      },
      ahora
    )
  ) {
    return hecho(
      "recibe_ofertas",
      `Recibe ofertas hasta el ${fechaLegible(s.fechaRecepcion)}, al final del día.`
    );
  }
  const recepcion = dia(s.fechaRecepcion);
  if (
    /^evaluaci[oó]n$/i.test(estado) ||
    s.estadoApertura === "Cerrado" ||
    (recepcion && recepcion < hoy)
  ) {
    return hecho(
      "en_evaluacion",
      recepcion
        ? `La recepción de ofertas cerró el ${fechaLegible(recepcion)}. La entidad no ha publicado el resultado.`
        : "Ya no recibe ofertas. La entidad no ha publicado el resultado."
    );
  }

  // 5 · Sin señales suficientes: no se afirma nada.
  if ((ESTADOS_ABIERTO as readonly string[]).includes(estado) && !recepcion) {
    return hecho(
      "por_verificar",
      "El SECOP lo muestra abierto, pero no publica una fecha para recibir ofertas: no se puede afirmar que las reciba. Confírmalo en el expediente."
    );
  }
  return hecho(
    "por_verificar",
    estado
      ? `El SECOP lo marca como «${estado}». Confirma en el expediente en qué va.`
      : "El SECOP no publica el estado de este proceso. Confírmalo en el expediente."
  );
}

/**
 * La fuente pega a veces la fase al final de la referencia o del objeto:
 * «ALSUTAMAR-CMA-002-2026 (Presentación de oferta)». Se quita al pintar (R3),
 * sin tocar la base.
 */
export function sinFasePegada(texto: string): string {
  return texto
    .replace(
      /\s*\((?:presentaci[oó]n de (?:oferta|observaciones)|fase de [^)]*|manifestaci[oó]n de inter[eé]s[^)]*|selecci[oó]n de ofertas[^)]*|proceso de ofertas)\)\s*$/i,
      ""
    )
    .trim();
}
