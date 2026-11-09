import type { ResultadoDocumental, PaginaDeDocumento } from "./document-requirements";

/**
 * Modelo interno de revisión para Talent Intelligence. No es un DTO público:
 * ninguna salida de este módulo habilita publicación automática ni vacantes.
 */
export interface RequisitoEnRevision {
  documentoId: string;
  pagina: number;
  cargoDetectado: string;
  familias: readonly string[];
  tipoDeclaradoPorReglas: "obligatorio" | "puntuable" | "opcional" | "por_verificar";
  experienciaGeneralAnios: number | null;
  experienciaEspecificaAnios: number | null;
  dedicacionPorcentaje: number | null;
  cita: string;
  motivosRevision: Array<"documento_no_verificado" | "tabla_probable" | "cargos_multiples">;
  visibilidad: "revision_interna";
  esVacante: false;
}

/**
 * En tablas o líneas con varios cargos NO se muestran años ni dedicaciones:
 * Poppler puede mezclar columnas y atribuir requisitos al rol equivocado.
 *
 * Para toda salida sigue siendo obligatoria la verificación del documento
 * original, su versión y las condiciones de acceso antes de publicar.
 */
export function prepararRevisionPersonal(
  resultados: readonly ResultadoDocumental[],
  paginas: readonly PaginaDeDocumento[]
): RequisitoEnRevision[] {
  const paginasPorNumero = new Map<number, string>();
  for (const pagina of paginas) {
    if (paginasPorNumero.has(pagina.numero)) throw new Error("Página duplicada");
    paginasPorNumero.set(pagina.numero, pagina.texto);
  }

  return resultados.map((resultado) => {
    const pagina = paginasPorNumero.get(resultado.pagina);
    if (pagina === undefined) throw new Error("Falta página para validar requisito");

    const linea = pagina.split(/\r?\n/)[resultado.requisito.linea - 1];
    if (linea === undefined) throw new Error("No existe la línea de origen");
    const cita = resultado.requisito.evidencia.fragmento;

    // El texto debe estar realmente contenido en la página indicada.
    const normalizada = linea.replace(/\s+/g, " ").trim();
    if (normalizada !== cita) throw new Error("Cita distinta de la línea de origen");

    const tablaProbable = /\t|\s{3,}|\s*\|\s*/.test(linea);
    const variosCargos = resultado.requisito.familias.length > 1;
    const motivos: RequisitoEnRevision["motivosRevision"] = ["documento_no_verificado"];
    if (tablaProbable) motivos.push("tabla_probable");
    if (variosCargos) motivos.push("cargos_multiples");

    return {
      documentoId: resultado.documentoId,
      pagina: resultado.pagina,
      cargoDetectado: cita,
      familias: resultado.requisito.familias,
      tipoDeclaradoPorReglas: resultado.requisito.tipo,
      experienciaGeneralAnios:
        tablaProbable || variosCargos ? null : resultado.requisito.experienciaGeneralAnios,
      experienciaEspecificaAnios:
        tablaProbable || variosCargos ? null : resultado.requisito.experienciaEspecificaAnios,
      dedicacionPorcentaje:
        tablaProbable || variosCargos ? null : resultado.requisito.dedicacionPorcentaje,
      cita,
      motivosRevision: motivos,
      visibilidad: "revision_interna" as const,
      esVacante: false as const,
    };
  });
}
