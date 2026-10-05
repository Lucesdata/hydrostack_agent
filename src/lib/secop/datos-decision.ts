/**
 * Los datos del bloque de decisión (`BloqueDecision`) a partir de una ficha.
 *
 * Los usan la ficha (`/licitaciones/[slug]`) y el panel del Radar de la
 * vitrina: un solo sitio que decide cómo se formatea el presupuesto, qué URL
 * del SECOP se acepta y a dónde manda «explorar», para que los dos digan lo
 * mismo del mismo proceso.
 */

import { formatCopFull } from "@/src/components/secop/format";
import type { DatosDecision } from "@/src/components/secop/ficha/BloqueDecision";
import { TIPO_PROYECTO } from "../classify/tipo-proyecto";
import { aSecopProceso, type ProcesoFicha } from "./ficha";
import { montoConDato } from "./monto";
import { compuertasAbsolutas, fechaCortaDeDia } from "./semaforo";

/** Solo un enlace http(s): lo demás que traiga la fuente no se pinta como enlace. */
export function urlSecopDe(url: string | null): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null;
}

export function datosDecisionDe(
  p: ProcesoFicha,
  opciones: { conPliego: boolean; hrefFicha?: string }
): DatosDecision {
  const valor = montoConDato(p.valorEstimado);
  return {
    proceso: aSecopProceso(p),
    absolutas: compuertasAbsolutas(p),
    conPliego: opciones.conPliego,
    urlSecop: urlSecopDe(p.url),
    presupuesto: valor !== null ? formatCopFull(valor) : "Sin presupuesto publicado",
    conPresupuesto: valor !== null,
    fechaPublicacion: p.fechaPublicacion,
    fechaRecepcion: p.fechaRecepcion,
    fechaPublicacionTexto: fechaCortaDeDia(p.fechaPublicacion),
    fechaRecepcionTexto: fechaCortaDeDia(p.fechaRecepcion),
    estadoApertura: p.estadoApertura,
    modalidad: p.modalidad,
    hrefExplorar: p.tipoProyecto
      ? `/licitaciones/tipo/${TIPO_PROYECTO[p.tipoProyecto].slug}`
      : "/licitaciones",
    hrefFicha: opciones.hrefFicha ?? "",
  };
}
