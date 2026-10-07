/** Presentación temporal de la ficha; la regla de negocio sigue en etapaDeProceso. */
import { etapaDeProceso, fechaLegible, type SenalesProceso } from "./etapa";
import { diaEnColombia } from "./estados-abierto";

/** Valida el día de una columna DATE, sin reinterpretarlo en otra zona horaria. */
export function diaVerificado(valor: string | null | undefined): string | null {
  if (!valor || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(valor)) return null;
  const dia = valor.slice(0, 10);
  const fecha = new Date(`${dia}T12:00:00Z`);
  return Number.isFinite(fecha.getTime()) && fecha.toISOString().slice(0, 10) === dia ? dia : null;
}

export function guiaTemporal(s: SenalesProceso, cierrePliego: string | null, ahora: Date) {
  const limpio = {
    ...s,
    fechaPublicacion: diaVerificado(s.fechaPublicacion),
    fechaRecepcion: diaVerificado(s.fechaRecepcion),
  };
  const etapa = etapaDeProceso(limpio, ahora);
  const suspendido =
    /suspendid/i.test(s.estadoActual ?? "") || /suspendid/i.test(etapa.contrato?.estado ?? "");
  const fin = limpio.fechaRecepcion;
  const hoy = diaEnColombia(ahora);
  const restante = fin ? Math.round((Date.parse(fin) - Date.parse(hoy)) / 86400000) : null;
  const textual = !!cierrePliego?.trim();
  const dias =
    !suspendido &&
    etapa.etapa === "recibe_ofertas" &&
    !textual &&
    restante !== null &&
    restante >= 0
      ? restante
      : null;
  const inicio = limpio.fechaPublicacion;
  const total = fin && inicio ? Date.parse(fin) - Date.parse(inicio) : 0;
  const avance =
    dias !== null && total > 0
      ? Math.min(100, Math.max(0, ((Date.parse(hoy) - Date.parse(inicio!)) / total) * 100))
      : null;
  const cierre = textual ? cierrePliego!.trim() : fechaLegible(fin);
  const mensajePlazo = suspendido
    ? "Proceso suspendido · confirma el plazo vigente"
    : textual
      ? "Fecha extraída del pliego · confirma su vigencia en el documento y las adendas"
      : dias === 0
        ? "Cierra hoy · hora no publicada"
        : dias !== null
          ? "Días naturales hasta el cierre · hora no publicada"
          : restante !== null && restante < 0
            ? "Plazo de ofertas finalizado"
            : etapa.etapa === "recibe_ofertas"
              ? "Confirma el plazo vigente"
              : "Sin cuenta regresiva de ofertas vigente";
  const orientacion = suspendido
    ? {
        titulo: "El proceso está suspendido.",
        texto: "Consulta el acto de suspensión y las fechas vigentes.",
        href: "#ficha-secop",
        enlace: "Consultar fuente oficial",
      }
    : etapa.etapa === "recibe_ofertas"
      ? {
          titulo: "Es momento de preparar tu oferta.",
          texto: "Revisa el pliego, sus adendas y los soportes antes de presentar la propuesta.",
          href: "#ficha-documentos",
          enlace: "Revisar documentos",
        }
      : etapa.etapa === "en_evaluacion"
        ? {
            titulo: "La recepción de ofertas terminó.",
            texto: "Consulta la evaluación y el cronograma vigente en el expediente.",
            href: "#ficha-plazos",
            enlace: "Consultar cronograma",
          }
        : etapa.etapa === "por_verificar"
          ? {
              titulo: "Confirma la situación del proceso.",
              texto: "Los datos disponibles no permiten asegurar que reciba ofertas ahora.",
              href: "#ficha-secop",
              enlace: "Consultar fuente oficial",
            }
          : {
              titulo: etapa.nombre,
              texto: etapa.linea,
              href: "#ficha-general",
              enlace: "Consultar detalles del proceso",
            };
  const indice =
    etapa.etapa === "recibe_ofertas"
      ? 1
      : etapa.etapa === "en_evaluacion"
        ? 2
        : etapa.etapa === "adjudicado"
          ? 3
          : ["contratado", "en_ejecucion", "plazo_cumplido"].includes(etapa.etapa)
            ? 4
            : -1;
  const etapas = [
    {
      id: "publicacion",
      nombre: "Publicación",
      fecha: fechaLegible(limpio.fechaPublicacion),
      texto: "Inicio del proceso según los datos publicados en SECOP II.",
    },
    {
      id: "ofertas",
      nombre: "Ofertas",
      fecha: cierre,
      texto:
        "Plazo de presentación de propuestas. La hora y las condiciones deben confirmarse en el pliego.",
    },
    {
      id: "evaluacion",
      nombre: "Evaluación",
      fecha: null,
      texto:
        "Revisión de las ofertas y observaciones al informe. Consulta las fechas en el cronograma.",
    },
    {
      id: "adjudicacion",
      nombre: "Adjudicación",
      fecha: fechaLegible(s.fechaAdjudicacion),
      texto: "Resultado de selección de la entidad; no equivale a la firma del contrato.",
    },
    {
      id: "contrato",
      nombre: "Contrato",
      fecha: fechaLegible(etapa.contrato?.fechaFirma),
      texto:
        "Firma y fechas del contrato cuando se publican. Las fechas no demuestran avance de obra.",
    },
  ].map((e, i) => ({
    ...e,
    actual: !suspendido && i === indice,
    completada: i < indice && !!e.fecha,
  }));
  return {
    ahora: ahora.toISOString(),
    etapa,
    suspendido,
    dias,
    cierre,
    mensajePlazo,
    avance,
    etapas,
    accion: orientacion,
  };
}
