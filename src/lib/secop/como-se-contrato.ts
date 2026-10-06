/**
 * «Cómo se contrató»: lo que la ficha cuenta de un proceso que ya no recibe
 * ofertas y tiene contrato firmado (PR 3 del plan
 * 2026-10-05-ficha-viva-ciclo-de-vida).
 *
 * Puro y sin base. Tres decisiones del usuario (2026-10-05) lo acotan:
 * - **Solo procesos publicados desde el 1 de enero de 2026.** Los anteriores
 *   conservan su etapa (no pueden figurar abiertos) pero no se amplían.
 * - **Personas naturales fuera.** Solo se nombra al contratista si su documento
 *   es **NIT**. Cédula, cédula de extranjería, pasaporte, permiso por protección
 *   temporal, «OTRO» o sin dato se tratan como persona natural: ante la duda, no
 *   se expone (spec, «Personas naturales»; M10: 44 % de los contratos de 2026).
 * - **«Plazo cumplido»** y no «Terminado»: la etapa la pone `etapaDeProceso()`.
 *
 * Presupuesto, valor del contrato y pagado son tres cosas distintas y nunca se
 * suman ni se sustituyen (criterio 6 del spec). Una prórroga o una adición son
 * hechos del contrato, no contradicciones. El pagado se rotula «según el SECOP»
 * y nunca como avance de obra.
 */

import type { ContratoSenal, Etapa } from "./etapa";
import { fechaLegible } from "./etapa";

/** Un contrato tal como lo lee la ficha: las señales de la etapa más el contratista. */
export interface ContratoFicha extends ContratoSenal {
  /** `proveedor.razon_social`; `null` si el contrato no resolvió proveedor. */
  contratista: string | null;
  /** `proveedor.tipo_documento`: NIT | CC | CE | PASAPORTE | OTRO | … | null. */
  tipoDocumento: string | null;
  valorPagado: string | number | null;
}

export interface ContratoVista {
  /** Nombre del contratista, o `null` si no se puede mostrar (persona natural o sin dato). */
  contratista: string | null;
  valor: number | null;
  /** Lo que creció el valor sobre el inicial; `null` si no hubo adición. */
  adicion: number | null;
  inicio: string | null;
  finPrevisto: string | null;
  finActual: string | null;
  /** Días que se movió el fin respecto al inicial; `null` si no hubo prórroga. */
  prorrogaDias: number | null;
  pagado: number | null;
  estado: string | null;
}

export interface ComoSeContrato {
  contratos: ContratoVista[];
  /** Contratos de personas naturales (o sin tipo de documento) que no se detallan. */
  ocultos: number;
}

/** Desde cuándo se amplía la ficha con el ciclo de vida (decisión del usuario). */
export const DESDE_CICLO_DE_VIDA = "2026-01-01";

const ETAPAS_CON_CONTRATO: readonly Etapa[] = ["contratado", "en_ejecucion", "plazo_cumplido"];

const CONTRATO_SIN_FIRMAR = /^(borrador|enviado proveedor|en aprobaci[oó]n)$/i;
const CANCELADO = /cancel|desiert|revoc/i;

/** Persona jurídica = documento NIT. Cualquier otra cosa, incluido sin dato, no se nombra. */
export function esPersonaJuridica(tipoDocumento: string | null | undefined): boolean {
  return (tipoDocumento ?? "").trim().toUpperCase() === "NIT";
}

const numero = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const dia = (iso: string | null | undefined): string | null =>
  iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : null;

function diasEntre(desde: string, hasta: string): number {
  return Math.round(
    (Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86_400_000
  );
}

function firmado(c: ContratoSenal): boolean {
  const estado = c.estado?.trim() ?? "";
  return !!dia(c.fechaFirma) && !CONTRATO_SIN_FIRMAR.test(estado) && !CANCELADO.test(estado);
}

/**
 * Lo que se pinta en «Cómo se contrató», o `null` si no aplica: proceso anterior
 * a 2026, etapa sin contrato firmado, o solo contratos de personas naturales.
 */
export function comoSeContrato(
  fechaPublicacion: string | null,
  etapa: Etapa,
  contratos: ContratoFicha[]
): ComoSeContrato | null {
  const publicado = dia(fechaPublicacion);
  if (!publicado || publicado < DESDE_CICLO_DE_VIDA) return null;
  if (!ETAPAS_CON_CONTRATO.includes(etapa)) return null;

  const firmados = contratos.filter(firmado);
  const visibles = firmados.filter((c) => esPersonaJuridica(c.tipoDocumento) && c.contratista);
  if (visibles.length === 0) return null;

  const vistas = [...visibles]
    .sort((a, b) => (dia(b.fechaFirma) ?? "").localeCompare(dia(a.fechaFirma) ?? ""))
    .map((c): ContratoVista => {
      const inicial = numero(c.valorInicial);
      const actual = numero(c.valorActual) ?? inicial;
      const finInicial = dia(c.fechaFinInicial);
      const finActual = dia(c.fechaFinActual) ?? finInicial;
      const prorroga =
        finInicial && finActual && finActual > finInicial ? diasEntre(finInicial, finActual) : null;
      return {
        contratista: c.contratista!.trim(),
        valor: actual,
        adicion: inicial && actual && actual > inicial ? actual - inicial : null,
        inicio: fechaLegible(c.fechaInicio),
        finPrevisto: fechaLegible(finInicial),
        finActual: fechaLegible(finActual),
        prorrogaDias: prorroga,
        pagado: numero(c.valorPagado),
        estado: c.estado?.trim() || null,
      };
    });

  return { contratos: vistas, ocultos: firmados.length - visibles.length };
}
