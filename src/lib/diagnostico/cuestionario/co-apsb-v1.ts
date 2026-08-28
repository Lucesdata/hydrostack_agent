/**
 * Cuestionario `co-apsb-v1` — Colombia · agua potable y saneamiento básico.
 *
 * CONTENIDO, NO LÓGICA. Los textos son copia literal del prototipo validado
 * en docs/referencia/diagnostico-referencia.html
 * (sha256 18aefae55f80ba0f7806ddec017b2b80e357555bcd8053aa70ae2eb2346fb33e),
 * incluidos puntajes, flags y umbrales. No se "mejoran" ni se reescriben: si
 * algo parece incorrecto se reporta y se decide, como se hizo con los tres
 * hallazgos de docs/diagnostico/02-cuestionario-co-apsb-v1.md §5.
 *
 * ÚNICA EXCEPCIÓN: `VEREDICTO_BLOQUEADO` es texto propio, no del prototipo.
 * Existe porque el prototipo deja que un bloqueante absoluto conviva con el
 * veredicto "Listo" ("puedes presentarte esta misma semana" junto a "una
 * inhabilidad hace que la oferta se rechace sin evaluar nada más"). Decisión
 * tomada: no se toca el puntaje ni la banda, se sobreescribe el titular.
 *
 * El módulo está congelado por versión. Un cambio normativo futuro crea
 * `co-apsb-v2.ts`; este archivo no se edita, porque `diagnostico.version`
 * apunta a él desde filas ya guardadas.
 *
 * La lógica de cálculo vive en ../calcular.ts.
 */

import type {
  Categoria,
  EscalonContratacion,
  Fact,
  Mito,
  Peldano,
  Pregunta,
  Remedio,
  RemedioId,
  BandaPreparacion,
  TextoRuta,
  TextoVeredicto,
} from "../types";

export const VERSION_CUESTIONARIO = "co-apsb-v1";

/** Orden de presentación de las barras del resultado. NO es el orden de las preguntas. */
export const CATEGORIAS: readonly Categoria[] = [
  { id: "juridica", label: "Habilitación jurídica" },
  { id: "experiencia", label: "Experiencia" },
  { id: "financiera", label: "Capacidad financiera" },
  { id: "tecnica", label: "Capacidad técnica" },
  { id: "secop", label: "Operación en SECOP II" },
  { id: "estrategia", label: "Estrategia" },
];

/** 10 preguntas × 10 puntos = 100. El orden de las opciones fija el atajo de teclado. */
export const PREGUNTAS: readonly Pregunta[] = [
  {
    key: "rup",
    categoria: "juridica",
    texto: "¿La empresa está inscrita en el RUP y renovada este año?",
    ayuda:
      "El Registro Único de Proponentes se renueva a más tardar el quinto día hábil de abril. Si no se renovó, cesan sus efectos y no sirve para acreditar nada.",
    opciones: [
      { texto: "Sí, inscrita y renovada", puntos: 10 },
      { texto: "Inscrita, pero sin renovar este año", puntos: 4, flag: "rup_vencido" },
      { texto: "No estamos inscritos", puntos: 2, flag: "rup_no" },
      { texto: "No sé qué es el RUP", puntos: 0, flag: "rup_no" },
    ],
  },
  {
    key: "unspsc",
    categoria: "juridica",
    texto: "¿Tienen inscritos los códigos UNSPSC de agua y saneamiento?",
    ayuda:
      "Es el clasificador de bienes y servicios. Si tu experiencia no está inscrita bajo el código que pide el pliego, la entidad no la puede contar aunque el contrato exista.",
    opciones: [
      { texto: "Sí, los tenemos identificados", puntos: 10 },
      { texto: "Tenemos RUP pero no sé cuáles quedaron", puntos: 5, flag: "unspsc" },
      { texto: "No, todavía no", puntos: 1, flag: "unspsc" },
    ],
  },
  {
    key: "exp",
    categoria: "experiencia",
    texto: "¿Qué contratos terminados puede certificar la empresa?",
    ayuda:
      "Sirven contratos de acueducto, alcantarillado, PTAP, PTAR, aseo u obras complementarias. Se acreditan con el contrato más el acta de liquidación o una certificación del contratante.",
    opciones: [
      { texto: "Varios con entidades públicas", puntos: 10 },
      { texto: "Con empresas privadas o E.S.P.", puntos: 8 },
      { texto: "Uno o dos, pequeños", puntos: 5 },
      { texto: "Trabajos hechos pero sin contrato formal", puntos: 2, flag: "exp_informal" },
      { texto: "Ninguno todavía", puntos: 0, flag: "exp_cero" },
    ],
  },
  {
    key: "fin",
    categoria: "financiera",
    texto: "¿Los estados financieros están al día y firmados?",
    ayuda:
      "De ahí salen los indicadores que evalúa la entidad: liquidez, endeudamiento, cobertura de intereses, patrimonio, ROE y ROA. Se reportan al RUP con el mejor de los últimos tres años.",
    opciones: [
      { texto: "Sí, con revisor fiscal", puntos: 10 },
      { texto: "Sí, firmados por contador", puntos: 8 },
      { texto: "Existen pero están atrasados", puntos: 3, flag: "fin_atraso" },
      { texto: "No los tenemos preparados", puntos: 0, flag: "fin_no" },
    ],
  },
  {
    key: "secop",
    categoria: "secop",
    texto: "¿Tienen usuario de proveedor creado en SECOP II?",
    ayuda:
      "Es gratuito y obligatorio para presentar ofertas. Sin el usuario configurado y con permisos, la plataforma no deja enviar nada el día del cierre.",
    opciones: [
      { texto: "Sí, y ya lo hemos usado", puntos: 10 },
      { texto: "Está creado pero nunca lo usamos", puntos: 6, flag: "secop_frio" },
      { texto: "No lo hemos creado", puntos: 1, flag: "secop_no" },
    ],
  },
  {
    key: "poliza",
    categoria: "financiera",
    texto: "¿Tienen relación con una aseguradora o corredor de seguros?",
    ayuda:
      "La garantía de seriedad acompaña la oferta y la garantía única acompaña el contrato. Conviene saber de antemano hasta qué monto te aprueban cupo.",
    opciones: [
      { texto: "Sí, ya nos han expedido pólizas", puntos: 10 },
      { texto: "No, pero tenemos con quién gestionarlo", puntos: 6 },
      { texto: "No sabemos si nos aprobarían", puntos: 2, flag: "poliza" },
    ],
  },
  {
    key: "tec",
    categoria: "tecnica",
    texto: "¿Cuentan con ingeniero con matrícula profesional vigente?",
    ayuda:
      "Civil, sanitario o ambiental según el objeto. La matrícula del COPNIA debe estar vigente y sin sanciones al momento de la verificación.",
    opciones: [
      { texto: "Sí, en nómina", puntos: 10 },
      { texto: "Disponible por contrato cuando se necesite", puntos: 8 },
      { texto: "No tenemos a nadie identificado", puntos: 2, flag: "tec" },
    ],
  },
  {
    key: "pila",
    categoria: "juridica",
    texto: "¿La empresa está al día en seguridad social y parafiscales?",
    ayuda:
      "Se certifica por los últimos seis meses, firmada por el revisor fiscal si la empresa está obligada a tenerlo, o por el representante legal si no.",
    opciones: [
      { texto: "Sí, al día", puntos: 10 },
      { texto: "Con alguna mora pendiente", puntos: 2, flag: "pila_mora" },
      { texto: "No tenemos empleados vinculados", puntos: 6, flag: "pila_sin" },
    ],
  },
  {
    key: "antec",
    categoria: "juridica",
    texto: "¿Han verificado los antecedentes de la empresa y del representante legal?",
    ayuda:
      "Contraloría, Procuraduría, antecedentes judiciales, medidas correctivas y REDAM. Un reporte activo del representante legal inhabilita a toda la empresa.",
    opciones: [
      { texto: "Sí, verificados y limpios", puntos: 10 },
      { texto: "Nunca los hemos revisado", puntos: 4, flag: "antec_rev" },
      { texto: "Sabemos que hay un reporte activo", puntos: 0, flag: "antec_mal" },
    ],
  },
  {
    key: "union",
    categoria: "estrategia",
    texto: "¿Estarían dispuestos a presentarse en consorcio o unión temporal?",
    ayuda:
      "Es la forma más rápida de entrar: la experiencia y los indicadores financieros se suman entre los integrantes, y la responsabilidad frente a la entidad es solidaria.",
    opciones: [
      { texto: "Sí, y ya tenemos aliados posibles", puntos: 10 },
      { texto: "Estaríamos abiertos a buscarlos", puntos: 8 },
      { texto: "Preferimos presentarnos solos", puntos: 5, flag: "solo" },
    ],
  },
];

/**
 * Catálogo de remedios. `absoluto: true` solo en los dos que bloquean en
 * cualquier modalidad, mínima cuantía incluida — los demás `hard` son
 * relativos al escalón y la escalera ya se autocorrige (ver 02-cuestionario §5.2).
 */
export const REMEDIOS: Readonly<Record<RemedioId, Remedio>> = {
  antec_mal: {
    id: "antec_mal",
    severidad: "hard",
    absoluto: true,
    titulo: "Resuelve primero el reporte activo",
    detalle:
      "Una inhabilidad del representante legal o de la empresa hace que la oferta se rechace sin evaluar nada más. Verifica el origen, gestiona el paz y salvo o, si no se puede levantar, evalúa cambiar la representación legal.",
    chips: ["Bloqueante", "Contraloría · Procuraduría · REDAM"],
  },
  pila_mora: {
    id: "pila_mora",
    severidad: "hard",
    absoluto: true,
    titulo: "Ponte al día en seguridad social y parafiscales",
    detalle:
      "La certificación de los últimos seis meses es requisito habilitante y no admite mora. Acuerda un plan de pago y solicita el paz y salvo antes de mirar cualquier proceso.",
    chips: ["Bloqueante", "1 a 4 semanas"],
  },
  rup_no: {
    id: "rup_no",
    severidad: "hard",
    absoluto: false,
    titulo: "Inscríbete en el RUP",
    detalle:
      "Se tramita en la cámara de comercio de tu domicilio, con estados financieros, certificaciones de experiencia y los códigos UNSPSC. Queda en firme diez días hábiles después de la publicación. No lo necesitas para mínima cuantía, pero sí para todo lo demás.",
    chips: ["Cámara de comercio", "3 a 6 semanas"],
  },
  rup_vencido: {
    id: "rup_vencido",
    severidad: "hard",
    absoluto: false,
    titulo: "Renueva el RUP",
    detalle:
      "Sin renovación, el registro no produce efectos y no puedes acreditar experiencia ni indicadores. Es un trámite mucho más corto que la inscripción inicial.",
    chips: ["Cámara de comercio", "1 a 2 semanas"],
  },
  fin_no: {
    id: "fin_no",
    severidad: "hard",
    absoluto: false,
    titulo: "Prepara los estados financieros",
    detalle:
      "Sin balance y estado de resultados firmados no hay indicadores que reportar, y sin indicadores no hay RUP útil. Empieza por el último año cerrado.",
    chips: ["Contador", "2 a 6 semanas"],
  },
  fin_atraso: {
    id: "fin_atraso",
    severidad: "soft",
    absoluto: false,
    titulo: "Actualiza los estados financieros atrasados",
    detalle:
      "El RUP toma el mejor de los últimos tres años fiscales. Si hay un buen año sin reportar, puede cambiar por completo tu capacidad de participar.",
    chips: ["Contador", "2 a 4 semanas"],
  },
  secop_no: {
    id: "secop_no",
    severidad: "hard",
    absoluto: false,
    titulo: "Crea el usuario de proveedor en SECOP II",
    detalle:
      "Registro gratuito en la plataforma de Colombia Compra Eficiente. Después configura los permisos de quien va a enviar ofertas: ese detalle es el que deja empresas por fuera el día del cierre.",
    chips: ["Gratis", "1 a 3 días"],
  },
  secop_frio: {
    id: "secop_frio",
    severidad: "soft",
    absoluto: false,
    titulo: "Haz un simulacro completo en SECOP II",
    detalle:
      "Entra a un proceso abierto, arma la oferta y llévala hasta el paso previo al envío. Descubrirás los límites de tamaño de archivo y los permisos faltantes sin la presión del reloj.",
    chips: ["1 tarde"],
  },
  unspsc: {
    id: "unspsc",
    severidad: "soft",
    absoluto: false,
    titulo: "Revisa y amplía tus códigos UNSPSC",
    detalle:
      "Compara los códigos inscritos en tu RUP con los que exigen los procesos de acueducto, alcantarillado y tratamiento que te interesan. Ampliarlos es una actualización del registro.",
    chips: ["Cámara de comercio", "1 a 2 semanas"],
  },
  exp_cero: {
    id: "exp_cero",
    severidad: "soft",
    absoluto: false,
    titulo: "Entra por mínima cuantía o en consorcio",
    detalle:
      "Sin experiencia acreditable, la ruta es doble: procesos de mínima cuantía donde el requisito es liviano, y unión temporal con una empresa que ya tenga trayectoria. El primer contrato ejecutado se convierte en la experiencia del siguiente.",
    chips: ["Estrategia de entrada"],
  },
  exp_informal: {
    id: "exp_informal",
    severidad: "soft",
    absoluto: false,
    titulo: "Formaliza la experiencia que ya tienes",
    detalle:
      "Pide certificaciones a tus contratantes anteriores con objeto, valor, plazo, fechas y actividades ejecutadas. Un trabajo sin papel no existe para una entidad pública.",
    chips: ["2 a 4 semanas"],
  },
  poliza: {
    id: "poliza",
    severidad: "soft",
    absoluto: false,
    titulo: "Consulta tu cupo con una aseguradora",
    detalle:
      "Habla con un corredor antes de escoger procesos: saber hasta qué monto te aprueban garantía define a qué presupuestos puedes aspirar de forma realista.",
    chips: ["1 semana"],
  },
  tec: {
    id: "tec",
    severidad: "soft",
    absoluto: false,
    titulo: "Vincula un ingeniero con matrícula vigente",
    detalle:
      "Civil, sanitario o ambiental según el objeto. No hace falta nómina desde el primer día: una carta de compromiso con hoja de vida y matrícula del COPNIA suele bastar para presentarse.",
    chips: ["1 a 2 semanas"],
  },
  antec_rev: {
    id: "antec_rev",
    severidad: "soft",
    absoluto: false,
    titulo: "Verifica antecedentes antes de cada oferta",
    detalle:
      "Contraloría, Procuraduría, Policía, medidas correctivas y REDAM, tanto de la empresa como del representante legal. Son consultas gratuitas en línea y evitan un rechazo evitable.",
    chips: ["Gratis", "30 minutos"],
  },
  pila_sin: {
    id: "pila_sin",
    severidad: "soft",
    absoluto: false,
    titulo: "Define cómo vas a certificar los aportes",
    detalle:
      "Si no hay empleados vinculados, la certificación la firma el representante legal declarando la situación. Deja claro el soporte antes del cierre, no después.",
    chips: ["30 minutos"],
  },
  solo: {
    id: "solo",
    severidad: "soft",
    absoluto: false,
    titulo: "Reconsidera el consorcio para el primer proceso",
    detalle:
      "Presentarse solo desde el inicio significa cargar toda la experiencia, todos los indicadores y todo el riesgo. La mayoría de empresas nuevas entra acompañada y se independiza en el tercer o cuarto contrato.",
    chips: ["Estrategia de entrada"],
  },
};

/** Sin ningún flag disparado: el siguiente paso no es un trámite, es un proceso. */
export const PLAN_SIN_PENDIENTES = {
  titulo: "No tienes pendientes de habilitación",
  detalle:
    "Tu siguiente paso no es un trámite, es un proceso concreto. Filtra en SECOP II por objeto de acueducto o alcantarillado en tu departamento, escoge uno con presupuesto acorde a tu cupo de póliza y arma la oferta completa aunque sea de práctica.",
  chips: ["Esta semana"],
} as const;

export const VEREDICTOS: Readonly<Record<BandaPreparacion, TextoVeredicto>> = {
  listo: {
    antetitulo: "Listo",
    titulo: "Puedes presentarte a un proceso esta misma semana.",
    texto:
      "Tienes lo esencial en orden. Lo que falta es método: escoger procesos que encajen con tu experiencia real, leer el pliego completo y armar la primera carpeta. La segunda oferta te tomará la mitad del tiempo que la primera.",
  },
  casi: {
    antetitulo: "Casi",
    titulo: "Te separan dos o tres trámites de tu primera oferta.",
    texto:
      "La base está. Resuelve los puntos marcados abajo en el orden indicado y en unas semanas puedes presentarte sin depender de nadie. Mientras tanto, nada te impide entrar ya a un proceso de mínima cuantía.",
  },
  en_camino: {
    antetitulo: "En camino",
    titulo: "Empieza por mínima cuantía mientras completas el resto.",
    texto:
      "Todavía no estás para una licitación pública, pero eso no significa esperar. Hay procesos de mínima cuantía que puedes atender hoy, y cada uno que ejecutes se convierte en la experiencia que te habilita para el siguiente escalón.",
  },
  inicio: {
    antetitulo: "Punto de partida",
    titulo: "El camino existe y es más corto de lo que parece.",
    texto:
      "Ninguno de los pendientes es difícil por separado; el problema es no saber el orden. Abajo está la secuencia. Empieza por el primero, ignora los demás por ahora, y en dos meses tendrás un panorama distinto.",
  },
};

/**
 * TEXTO PROPIO (no viene del prototipo). Sustituye al titular de la banda
 * cuando hay al menos un bloqueante absoluto. El puntaje y la banda siguen
 * mostrándose sin alterar: lo que cambia es lo que se afirma sobre ellos.
 */
export const VEREDICTO_BLOQUEADO: TextoVeredicto = {
  antetitulo: "Bloqueado",
  titulo: "Hay un requisito que te deja fuera, aunque el resto esté listo.",
  texto:
    "Tu puntaje refleja todo lo que ya tienes resuelto y este bloqueo no lo baja. Pero un requisito habilitante no admite excepción: mientras siga abierto, la entidad rechaza tu oferta sin evaluar nada más. Lo encuentras primero en tu plan de acción — resuélvelo y todo lo que ya construiste empieza a contar.",
};

/** Los tres peldaños, en orden ascendente. */
export const ESCALERA: readonly Peldano[] = [
  {
    escalon: "minima_cuantia",
    nombre: "Mínima cuantía",
    descripcion:
      "No exige RUP ni suele exigir garantía. Un solo requisito técnico y la oferta más económica. Es el escalón de entrada.",
  },
  {
    escalon: "menor_cuantia",
    nombre: "Selección abreviada de menor cuantía",
    descripcion:
      "Ya pide RUP, experiencia acreditada e indicadores financieros. Hay etapa de manifestación de interés y sorteo si hay muchos interesados.",
  },
  {
    escalon: "licitacion_publica",
    nombre: "Licitación pública",
    descripcion:
      "Documentos tipo obligatorios, audiencia de riesgos, evaluación con puntaje y adjudicación en audiencia pública. Es el objetivo, no el punto de partida.",
  },
];

export const RUTAS: Readonly<Record<EscalonContratacion, TextoRuta>> = {
  minima_cuantia: {
    titulo: "Tu escalón hoy: mínima cuantía",
    texto:
      "Los montos son pequeños y la competencia también. Los umbrales dependen del presupuesto anual de cada entidad, así que revisa el tope de mínima cuantía de la alcaldía o empresa que te interesa.",
  },
  menor_cuantia: {
    titulo: "Tu escalón hoy: menor cuantía",
    texto:
      "Ya puedes competir donde la mayoría de empresas nuevas no llega. Vigila especialmente la correspondencia entre tus códigos UNSPSC y los del pliego.",
  },
  licitacion_publica: {
    titulo: "Tu escalón hoy: licitación pública",
    texto:
      "Estás en condiciones de ir por los procesos grandes. Ahí el diferencial deja de ser la habilitación y pasa a ser la lectura del pliego y la estrategia de precio.",
  },
};

/** Portada — las tres afirmaciones que desmontan la barrera de entrada. */
export const FACTS: readonly Fact[] = [
  { titulo: "Sin RUP", texto: "La mínima cuantía no exige registro de proponentes" },
  { titulo: "Sin pólizas", texto: "En mínima cuantía la garantía suele ser opcional" },
  { titulo: "En consorcio", texto: "Puedes usar la experiencia y los indicadores de un aliado" },
];

export const PORTADA = {
  antetitulo: "10 preguntas · 3 minutos",
  titulo: "Averigua si tu empresa ya puede presentarse a un proceso público.",
  /** La parte del titular que va en color de acento. */
  tituloEnfasis: "ya puede",
  lede: "La mayoría de empresas de acueducto, alcantarillado y saneamiento nunca licita porque nadie les dijo qué les falta exactamente. Esto te lo dice: qué tienes listo, qué te bloquea hoy y en qué orden resolverlo.",
  cta: "Empezar el diagnóstico →",
} as const;

export const MITOS: readonly Mito[] = [
  {
    afirmacion: "Sin contactos adentro no hay nada que hacer.",
    respuesta:
      "Los documentos tipo fijan requisitos y puntajes que la entidad no puede alterar. Si el pliego se desvía, eso se observa y se corrige.",
  },
  {
    afirmacion: "Eso es solo para empresas grandes.",
    respuesta:
      "Los municipios de categoría 5 y 6 contratan permanentemente por mínima y menor cuantía, montos que una empresa pequeña ejecuta sin problema.",
  },
  {
    afirmacion: "Necesito años de trámites antes de poder presentarme.",
    respuesta:
      "Usuario en SECOP II y RUT bastan para una mínima cuantía. El RUP toma semanas, no años.",
  },
  {
    afirmacion: "Si no gano, perdí la plata.",
    respuesta:
      "Presentarse no cuesta inscripción. El costo real es el tiempo de armar la oferta, y ese trabajo se reutiliza en el siguiente proceso.",
  },
  {
    afirmacion: "No tengo la experiencia que piden.",
    respuesta:
      "En consorcio o unión temporal la experiencia se suma. Es la vía normal de entrada, no un atajo.",
  },
  {
    afirmacion: "El pliego siempre viene con nombre propio.",
    respuesta:
      "Ocurre, y por eso existe la etapa de observaciones al proyecto de pliego. Un requisito sin respaldo en el análisis del sector se puede tumbar.",
  },
];

/** Obligatorio en el resultado. Ley 142 y dependencia del presupuesto de cada entidad. */
export const DISCLAIMER =
  "Este diagnóstico es una guía de preparación, no un concepto jurídico. Los umbrales de mínima y menor cuantía dependen del presupuesto anual de cada entidad, y las empresas de servicios públicos contratan bajo derecho privado (Ley 142 de 1994) con manual propio. Verifica siempre el pliego y la versión vigente de los documentos tipo antes de presentar una oferta.";
