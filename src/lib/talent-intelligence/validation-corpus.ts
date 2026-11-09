/**
 * Banco de 10 documentos para revisión técnica manual de Talent Intelligence.
 *
 * Estado «catalogado»: se identificó un documento público y sus fragmentos
 * indexados, pero NO se descargó ni inspeccionó visualmente el PDF original
 * dentro de este PR. Ninguna entrada implica que la extracción haya sido
 * validada o que exista una vacante.
 *
 * Solo contiene identificadores de convocatoria, URLs institucionales y
 * familias de requisitos; sin datos de personas naturales.
 */
export const CORPUS_TALENT_V0 = [
  {
    id: "PAF-ATF-O-004-2019",
    tipo: "acueducto",
    titulo: "Zipaquirá — construcción y optimización del sistema de acueducto",
    url: "https://www.findeter.gov.co/system/files/convocatorias/PAF-ATF-O-004-2019/PAF-ATF-O-004-2019%40paf-atf-o-004-2019_estudios-previos.pdf",
    referencia: "4.3.1, tabla de personal mínimo, página impresa 52",
    validacionVisual: "pendiente",
    perfilesObservados: ["director de obra", "residente de obra"],
  },
  {
    id: "PAF-AASB-I-121-2022",
    tipo: "acueducto",
    titulo: "Pamplona — interventoría captación, aducción y estructuras hidráulicas",
    url: "https://www.findeter.gov.co/system/files/convocatorias/PAF-AASB-I-121-2022/terminos_de_referencia.pdf",
    referencia: "Anexo técnico de personal, tabla página impresa 77",
    validacionVisual: "pendiente",
    perfilesObservados: [
      "director de interventoría",
      "residente de interventoría",
      "profesional social",
    ],
  },
  {
    id: "PAF-ATICBF-O-086-2022",
    tipo: "ptar",
    titulo: "ICBF Grupo 5 — diseños y obras, componente de tratamiento residual",
    url: "https://www.findeter.gov.co/system/files/convocatorias/PAF-ATICBF-O-086-2022/estudios_previos_obra_grupo_5_icbf_vf.pdf",
    referencia: "Tablas de personal mínimo para etapa de diseño; documento multipropósito",
    validacionVisual: "pendiente",
    perfilesObservados: ["ingeniero eléctrico", "especialista ambiental", "profesional social"],
  },
  {
    id: "PAF-AASB-O-012-2021",
    tipo: "redes",
    titulo: "FINDETER — obras de redes de alcantarillado y estudios/diseños",
    url: "https://www.findeter.gov.co/system/files/convocatorias/PAF-AASB-O-012-2021/ESTUDIOS_PREVIOS.pdf",
    referencia: "Tabla de personal mínimo requerido, sección de estudios y diseños",
    validacionVisual: "pendiente",
    perfilesObservados: ["director de proyecto"],
  },
  {
    id: "PAF-ATF-C-039-2015",
    tipo: "redes",
    titulo: "Tumaco — consultoría plan maestro de alcantarillado",
    url: "https://www.findeter.gov.co/system/files/convocatorias/PAF-ATF-C-039-2015/PAF-ATF-C-039-2015%40Ep_Consultoria_Pm_Alcantarillado_Tumaco_Ultima_Version.pdf",
    referencia: "Tabla personal mínimo de consultoría, página impresa 10",
    validacionVisual: "pendiente",
    perfilesObservados: ["director de proyecto", "coordinador de proyecto"],
  },
  {
    id: "PAF-ATF-O-138-2015",
    tipo: "redes",
    titulo: "Guachené — alcantarillado, segunda etapa",
    url: "https://www.findeter.gov.co/system/files/convocatorias/PAF-ATF-O-138-2015/PAF-ATF-O-138-2015%40Ep_Obra_Construccion_Etapa_Ii_Alcantarillado_Guachene.pdf",
    referencia: "Tabla de personal mínimo por fase, página impresa 10",
    validacionVisual: "pendiente",
    perfilesObservados: [
      "director de proyecto",
      "especialista hidráulico",
      "especialista ambiental",
    ],
  },
  {
    id: "PAF-DNP-C-004-2021",
    tipo: "ptar",
    titulo: "Coveñas — estructuración de alcantarillado y tratamiento residual",
    url: "https://www.findeter.gov.co/system/files/convocatorias/PAF-DNP-C-004-2021/ESTUDIO%20PREVIO%20CONSULTORIA%20ALCANTARILLADOS%20COVE%C3%91AS.pdf",
    referencia: "Sección 13.1.1, personal mínimo fase 1, página impresa 36",
    validacionVisual: "pendiente",
    perfilesObservados: ["equipo de consultoría"],
  },
  {
    id: "PAF-ATF-I-154-2022",
    tipo: "redes",
    titulo: "FINDETER — interventoría con hidrología y topografía",
    url: "https://www.findeter.gov.co/system/files/convocatorias/PAF-ATF-I-154-2022/estudio_previo.pdf",
    referencia: "Tabla de personal mínimo, página impresa 29",
    validacionVisual: "pendiente",
    perfilesObservados: ["especialista en hidrología", "topógrafo", "cadenero"],
  },
  {
    id: "PAF-ATF-O-042-2016",
    tipo: "ptap",
    titulo: "FINDETER — construcción de PTAP y redes de acueducto",
    url: "https://www.findeter.gov.co/system/files/convocatorias/PAF-ATF-O-042-2016/PAF-ATF-O-042-2016%40Estudios_Previos_Definitivos.pdf",
    referencia: "Tabla personal mínimo fase I, página impresa 30",
    validacionVisual: "pendiente",
    perfilesObservados: [
      "director de proyecto",
      "especialista hidráulico",
      "especialista en geotecnia",
    ],
  },
  {
    id: "PAF-ATF-130-2015",
    tipo: "ptar",
    titulo: "Popayán — obras de alcantarillado con componente PTAR",
    url: "https://www.findeter.gov.co/system/files/convocatorias/PAF-ATF-130-2015/PAF-ATF-130-2015%40Ep_Obras_Popayan_20_Abril.pdf",
    referencia: "Personal mínimo y principal, página impresa 41",
    validacionVisual: "pendiente",
    perfilesObservados: ["especialista electromecánico", "topógrafo", "maestro de obra"],
  },
] as const;

export type CasoCorpusTalentV0 = (typeof CORPUS_TALENT_V0)[number];

/** Ningún documento del corpus está marcado como verificado de origen. */
export const ESTADO_CORPUS_TALENT_V0 = "catalogado_sin_validacion_visual" as const;
