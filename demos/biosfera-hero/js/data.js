// Datos de equipos, etapas y textos del recorrido. Sin cifras comerciales ni técnicas.

export const LOTE_ID = "BIO-0000"; // identificador ilustrativo, no es un lote real

// Cada equipo: `grupo` enlaza con el grupo de la maquinaria; `punto` es la posición 3D del marcador.
export const EQUIPOS = [
  { id: "tolva", n: 1, nombre: "Tolva de alimentación", corto: "Tolva",
    texto: "Recibe el material a procesar de excavaciones, compostaje o residuos orgánicos.",
    punto: [-6.6, 3.9, 0] },
  { id: "cinta", n: 2, nombre: "Banda transportadora de alimentación", corto: "Banda",
    texto: "Lleva el material desde la tolva hasta el tromel.",
    punto: [-3.2, 2.9, 0.5] },
  { id: "tromel", n: 3, nombre: "Tromel (criba rotatoria)", corto: "Tromel",
    texto: "Separa el material por tamaño mediante rotación y mallas.",
    punto: [3, 5.35, 0] },
  { id: "cribado", n: 4, nombre: "Salida de material cribado", corto: "Material cribado",
    texto: "Descarga del material que pasa la malla (tamaño menor).",
    punto: [2.4, 1.1, 3.9] },
  { id: "plataforma", n: 5, nombre: "Plataforma de operación", corto: "Plataforma",
    texto: "Acceso para inspección, mantenimiento y control.",
    punto: [8.2, 4.1, -1.4] },
  { id: "rechazo", n: 6, nombre: "Salida de rechazo", corto: "Rechazo",
    texto: "Descarga del material de mayor tamaño.",
    punto: [7.7, 1.9, 2.2] },
];

// Zonas del recorrido -> grupos de la planta que se resaltan.
export const ZONAS = {
  tolva: { grupos: ["tolva"], nombre: "Tolva", texto: "Entra el lote: tierra mezclada con fragmentos metálicos." },
  cinta: { grupos: ["cinta"], nombre: "Banda transportadora", texto: "Lleva la mezcla desde la tolva hasta la entrada del tromel." },
  tromel: { grupos: ["tromel"], nombre: "Tromel", texto: "La mezcla recorre el interior y se separa en dos corrientes. Visualización conceptual de separación." },
  salidas: { grupos: ["cribado", "rechazo"], nombre: "Salidas", texto: "Tierra por un lado y metal recuperado por el otro. Visualización conceptual de separación." },
  admin: { grupos: [], nombre: "Etapa administrativa", texto: "No hay equipo físico asociado: se trata de documentación del lote." },
  fin: { grupos: [], nombre: "Recorrido completo", texto: "El resultado queda visible hasta que reinicies el lote." },
};

// Línea de tiempo del recorrido (segundos). El estado completo es función pura del tiempo.
export const TIEMPOS = {
  recepcion: [0, 6],
  tratamiento: [6, 28],
  documentacion: [28, 33],
  certificado: [33, 37],
  fin: 37,
};

export const ETAPAS = [
  { id: "recepcion", n: 1, titulo: "Recepción", breve: "Recibimos el lote en nuestra planta de Yumbo.",
    icono: "camion",
    explicacion: "Entra a la tolva un lote de tierra mezclada con fragmentos metálicos. Se le asigna un identificador que lo acompaña en todo el recorrido.",
    revisar: 3.5 },
  { id: "tratamiento", n: 2, titulo: "Tratamiento", breve: "Tratamos los residuos del lote.",
    icono: "maquina",
    explicacion: "La banda lleva la mezcla hacia la maquinaria y, dentro, se separa en dos corrientes: tierra y metal recuperado.",
    revisar: 15 },
  { id: "documentacion", n: 3, titulo: "Documentación", breve: "Cada lote queda documentado.",
    icono: "documento",
    explicacion: "Terminado el paso del lote, se muestra su registro asociado al mismo identificador. Los datos de este ejemplo son ilustrativos.",
    revisar: 30 },
  { id: "certificado", n: 4, titulo: "Certificado", breve: "Usted recibe el certificado de disposición de su lote.",
    icono: "certificado",
    explicacion: "El recorrido cierra con una representación documental del lote procesado. Es un ejemplo ilustrativo, no un certificado real.",
    revisar: 36 },
];

// Registro y certificado ilustrativos: sin mediciones. "—" = dato por registrar.
export const REGISTRO = {
  titulo: "Registro de lote",
  filas: [
    ["Identificador", LOTE_ID],
    ["Recepción", "Registrada"],
    ["Tratamiento", "Completado"],
    ["Corriente 1", "Tierra · cantidad: —"],
    ["Corriente 2", "Metal recuperado · cantidad: —"],
    ["Responsable", "—"],
  ],
};

export const CERTIFICADO = {
  titulo: "Certificado de disposición",
  filas: [
    ["Lote", LOTE_ID],
    ["Número de certificado", "—"],
    ["Estado", "Cierre documental del lote"],
    ["Fecha de emisión", "—"],
  ],
};

export const DEMOS = {
  cotizar: {
    titulo: "Solicitar cotización",
    texto: "Esta es una página de demostración: no hay un servicio de cotización configurado. No se envía ni se guarda ninguna información.",
  },
  residuos: {
    titulo: "Qué residuos gestionamos",
    texto: "Demostración: el listado real de residuos, autorizaciones y licencias debe aportarlo Biosfera. Aquí solo se menciona la categoría general: residuos peligrosos y RAEE.",
  },
  servicios: { titulo: "Servicios", texto: "Sección de demostración: el contenido comercial aún no está integrado." },
  campanas: { titulo: "Campañas", texto: "Sección de demostración: el contenido comercial aún no está integrado." },
  licencias: { titulo: "Licencias", texto: "Sección de demostración: no se muestran licencias porque Biosfera aún no ha aportado la información verificada." },
};
