/**
 * Cuestionario `co-esp-v1` — venderle a una empresa de servicios públicos
 * (Ley 142), Colombia · agua potable y saneamiento básico.
 *
 * ORIGEN DEL CONTENIDO, distinto al de `co-apsb-v1`: este NO es copia de una
 * fuente validada. Se redactó en
 * docs/diagnostico/04-propuesta-co-esp-v1.md y aquí está la **versión
 * recortada** de esa propuesta: solo las preguntas cuyo enunciado no depende de
 * una interpretación jurídica que nadie ha verificado todavía.
 *
 * QUÉ SE DEJÓ FUERA Y POR QUÉ. La propuesta traía ocho preguntas; faltan dos:
 * inhabilidades e incompatibilidades, y aportes a seguridad social. Su alcance
 * cuando el contrato se rige por derecho privado es justo lo que está pendiente
 * de revisión (04-propuesta §7.1), y de ellas colgaban los DOS bloqueantes
 * absolutos.
 *
 * CONSECUENCIA, que hay que mirar de frente: sin esas preguntas este
 * cuestionario **no tiene ningún remedio absoluto**, así que nunca puede
 * decirle a nadie "esto te deja fuera". Una empresa con una inhabilidad activa
 * sacaría "listo" aquí. Es exactamente el defecto que se le encontró al
 * prototipo de `co-apsb-v1` (02-cuestionario §5.1), y por eso el resultado
 * lleva `advertencia`: si el cuestionario no pregunta algo decisivo, lo dice en
 * vez de dejar que el puntaje prometa lo que no puede sostener.
 *
 * Los textos de los remedios de registro salen de fuente primaria: el portal
 * del Acueducto de Bogotá y el instructivo de registro en Ariba del Grupo EPM.
 * Ver docs/diagnostico/05-hallazgos-manuales-esp.md, que también deja anotados
 * dos huecos de este cuestionario — códigos UNSPSC y listas restrictivas — que
 * NO dependen de la revisión jurídica pendiente.
 *
 * VENTANA DE EDICIÓN, YA CERRADA. Este catálogo se publicó el 2026-08-29 y ese
 * mismo día se le añadieron dos preguntas —códigos UNSPSC y listas
 * restrictivas— editándolo EN SITIO en vez de crear una v2. Se hizo así porque
 * en ese momento las únicas filas con `version = 'co-esp-v1'` eran de prueba,
 * anónimas y creadas horas antes al verificarlo en el navegador; se borraron
 * junto con el cambio. Mismo criterio, y mismo tipo de ventana, que el rename
 * de la clave del `clientStore` (src/lib/state/clientStore.ts).
 *
 * Esa ventana está cerrada. De aquí en adelante este archivo se trata como
 * `co-apsb-v1`: congelado en su FORMA — claves de pregunta, opciones, puntajes
 * e ids de remedio. Corregir la prosa (un hecho equivocado, un texto confuso)
 * sí se puede y se debe: no cambia el puntaje de nadie ni rompe una fila
 * guardada. Añadir o quitar preguntas crea `co-esp-v2`, porque
 * una fila guardada con menos respuestas leída con un catálogo más grande
 * muestra áreas en "pendiente" que el usuario nunca respondió — verificado en
 * pantalla, que es como se detectó.
 *
 * Sin escalera y sin RUP: la Ley 142 no tiene peldaños (03-variante-ley-142 §2)
 * y estas empresas no exigen registro de proponentes. El resultado lleva
 * `escalon: null` y `estadoRup: null`.
 */

import type {
  Categoria,
  Cuestionario,
  Fact,
  Mito,
  Pregunta,
  Remedio,
  RemedioId,
  BandaPreparacion,
  TextoVeredicto,
} from "../types";

export const VERSION_CO_ESP_V1 = "co-esp-v1";

export const CATEGORIAS_ESP: readonly Categoria[] = [
  { id: "registro", label: "Registro ante la empresa" },
  { id: "juridica", label: "Situación jurídica" },
  { id: "experiencia", label: "Experiencia" },
  { id: "financiera", label: "Capacidad financiera" },
  { id: "tecnica", label: "Capacidad técnica" },
  { id: "estrategia", label: "Estrategia" },
];

/** 6 preguntas × 10 puntos = 60. El motor lo normaliza a 0-100. */
export const PREGUNTAS_ESP: readonly Pregunta[] = [
  {
    key: "registro",
    categoria: "registro",
    texto:
      "¿Estás inscrito en el registro de proveedores de la empresa a la que le quieres vender?",
    ayuda:
      "Las empresas de servicios públicos grandes mantienen su propio registro y suelen invitar solo a quien ya está dentro. Se hace en el portal de cada empresa y es el paso que más gente se salta.",
    opciones: [
      { texto: "Sí, en una o varias", puntos: 10 },
      { texto: "Me inscribí pero no sé si sigue activo", puntos: 6, flag: "registro_dudoso" },
      { texto: "No, todavía no", puntos: 1, flag: "registro_no" },
      { texto: "No sabía que existía", puntos: 0, flag: "registro_no" },
    ],
  },
  {
    key: "unspsc",
    categoria: "registro",
    texto: "¿Sabes bajo qué códigos UNSPSC quedaste clasificado en el registro?",
    ayuda:
      "El registro del Acueducto de Bogotá organiza a sus proveedores por los códigos estándar de Naciones Unidas. Si tu actividad no está bajo el código que la empresa consulta, no apareces cuando buscan a quién invitar — y eso pasa aunque estés inscrito.",
    opciones: [
      { texto: "Sí, los revisé y cubren lo que hacemos", puntos: 10 },
      { texto: "Estoy inscrito pero no sé cuáles quedaron", puntos: 5, flag: "unspsc_esp" },
      { texto: "No sé qué son", puntos: 1, flag: "unspsc_esp" },
    ],
  },
  {
    key: "exp",
    categoria: "experiencia",
    texto: "¿Qué contratos terminados puedes certificar?",
    ayuda:
      "Sin RUP de por medio, la experiencia se acredita con la certificación del contratante: objeto, valor, plazo y actividades ejecutadas. Los contratos con otras empresas del sector pesan más.",
    opciones: [
      { texto: "Varios, incluyendo con otras empresas de servicios públicos", puntos: 10 },
      { texto: "Con entidades públicas", puntos: 8 },
      { texto: "Solo con privados", puntos: 6 },
      { texto: "Trabajos hechos, pero sin certificación", puntos: 2, flag: "exp_informal" },
      { texto: "Ninguno todavía", puntos: 0, flag: "exp_cero" },
    ],
  },
  {
    key: "fin",
    categoria: "financiera",
    texto: "¿Los estados financieros están al día y firmados?",
    ayuda:
      "El manual de cada empresa define qué indicadores mira, pero todos parten del mismo balance. Si están atrasados, no hay conversación posible.",
    opciones: [
      { texto: "Sí, con revisor fiscal", puntos: 10 },
      { texto: "Sí, firmados por contador", puntos: 8 },
      { texto: "Existen pero están atrasados", puntos: 3, flag: "fin_atraso" },
      { texto: "No los tenemos preparados", puntos: 0, flag: "fin_no" },
    ],
  },
  {
    key: "flujo",
    categoria: "financiera",
    texto: "¿Podrías sostener el contrato si te pagan a 60 o 90 días?",
    ayuda:
      "Es la pregunta que más contratos hunde. Estas empresas manejan cuantías de cientos de millones y pagan contra actas parciales, no por adelantado.",
    opciones: [
      { texto: "Sí, con recursos propios", puntos: 10 },
      { texto: "Sí, con cupo de crédito aprobado", puntos: 8 },
      { texto: "Tendríamos que conseguir financiación", puntos: 4, flag: "flujo" },
      { texto: "No, ese plazo nos rompe", puntos: 1, flag: "flujo_no" },
    ],
  },
  {
    key: "tec",
    categoria: "tecnica",
    texto: "¿Cuentas con ingeniero con matrícula vigente y experiencia en el sector?",
    ayuda:
      "Civil, sanitario o ambiental según el objeto. Para obra de acueducto y alcantarillado importa que conozca el reglamento técnico del sector (RAS).",
    opciones: [
      { texto: "Sí, en nómina y con experiencia en agua y saneamiento", puntos: 10 },
      { texto: "Sí, con matrícula, pero sin experiencia en el sector", puntos: 7, flag: "tec_ras" },
      { texto: "Disponible por contrato cuando se necesite", puntos: 6 },
      { texto: "No tenemos a nadie identificado", puntos: 1, flag: "tec_no" },
    ],
  },
  {
    key: "listas",
    categoria: "juridica",
    texto:
      "¿Han verificado que la empresa y su representante legal no estén en listas restrictivas?",
    ayuda:
      "OFAC (la llamada Lista Clinton), Naciones Unidas, Banco Mundial y BID. El Grupo EPM suspende el registro de quien aparezca en ellas. La consulta es gratuita y se hace en línea.",
    opciones: [
      { texto: "Sí, verificados y limpios", puntos: 10 },
      { texto: "Nunca los hemos revisado", puntos: 4, flag: "listas_rev" },
      { texto: "Sabemos que hay un reporte", puntos: 0, flag: "listas_si" },
    ],
  },
  {
    key: "puerta",
    categoria: "estrategia",
    texto: "¿Has hablado con el área que contrata, o solo esperas la invitación?",
    ayuda:
      "En derecho privado la relación comercial es parte del proceso, no un atajo. Presentarse antes de que salga la invitación es legítimo y habitual.",
    opciones: [
      { texto: "Sí, tenemos contacto con el área técnica", puntos: 10 },
      { texto: "Hemos escrito pero sin respuesta", puntos: 6 },
      { texto: "No, solo miramos las publicaciones", puntos: 3, flag: "puerta" },
    ],
  },
];

export const REMEDIOS_ESP: Readonly<Record<RemedioId, Remedio>> = {
  registro_no: {
    id: "registro_no",
    severidad: "hard",
    absoluto: false,
    titulo: "Inscríbete en el registro de proveedores",
    detalle:
      "Es autogestionado y en línea. El Acueducto de Bogotá tiene el suyo en su portal de proveedores y lo organiza por códigos UNSPSC, así que revisa bajo qué código quedas clasificado. El Grupo EPM se registra en la plataforma Ariba, y con una sola inscripción quedas visible para EPM, EMVARIAS, CHEC, CENS, ESSA y EDEQ. ACUAVALLE no usa portal: se envía el formato de inscripción por correo, y además exige RUP y certificado de existencia con menos de 30 días. Sin estar dentro no te llega la invitación — aunque estar dentro tampoco obliga a la empresa a invitarte.",
    chips: ["Gratis", "1 a 3 semanas"],
  },
  fin_no: {
    id: "fin_no",
    severidad: "hard",
    absoluto: false,
    titulo: "Prepara los estados financieros",
    detalle:
      "El registro de proveedores los pide y el área financiera los evalúa. Empieza por el último año cerrado, firmado por contador.",
    chips: ["Contador", "2 a 6 semanas"],
  },
  flujo_no: {
    id: "flujo_no",
    severidad: "hard",
    absoluto: false,
    titulo: "Resuelve el flujo de caja antes de ofertar",
    detalle:
      "Ganar un contrato que no puedes financiar es peor que no ganarlo: responde con su patrimonio y su reputación. Consigue cupo de crédito o preséntate en unión con alguien que lo tenga, antes de presentar la oferta.",
    chips: ["Antes de ofertar"],
  },
  listas_si: {
    id: "listas_si",
    severidad: "hard",
    absoluto: true,
    titulo: "Resuelve primero el reporte en la lista restrictiva",
    detalle:
      "Mientras la empresa o su representante legal figure en OFAC, ONU, Banco Mundial o BID, el registro queda suspendido y ninguna oferta avanza. Verifica el origen del reporte y gestiona la exclusión; si no se puede levantar, evalúa cambiar la representación legal.",
    chips: ["Bloqueante", "OFAC · ONU · BM · BID"],
  },
  unspsc_esp: {
    id: "unspsc_esp",
    severidad: "soft",
    absoluto: false,
    titulo: "Revisa bajo qué códigos UNSPSC quedaste clasificado",
    detalle:
      "Entra a tu perfil en el registro y compara los códigos inscritos con los del tipo de contrato que te interesa. Estar inscrito bajo el código equivocado equivale a no estar: la empresa filtra por ahí cuando arma la lista de invitados.",
    chips: ["1 hora"],
  },
  listas_rev: {
    id: "listas_rev",
    severidad: "soft",
    absoluto: false,
    titulo: "Consulta las listas restrictivas antes de cada oferta",
    detalle:
      "OFAC, ONU, Banco Mundial y BID publican sus listas en línea y la consulta no cuesta nada. Revisa la empresa y el representante legal: es media hora que evita que te suspendan el registro sin enterarte.",
    chips: ["Gratis", "30 minutos"],
  },
  registro_dudoso: {
    id: "registro_dudoso",
    severidad: "soft",
    absoluto: false,
    titulo: "Confirma que tu registro sigue activo",
    detalle:
      "Mantenerlo al día es responsabilidad tuya, no de la empresa. En el Grupo EPM el registro se suspende si apareces en una lista restrictiva —OFAC, ONU, Banco Mundial, BID— y se cancela si detectan que algún documento del registro estaba alterado. Un registro suspendido tiene el mismo efecto que no tenerlo.",
    chips: ["30 minutos"],
  },
  exp_informal: {
    id: "exp_informal",
    severidad: "soft",
    absoluto: false,
    titulo: "Formaliza la experiencia que ya tienes",
    detalle:
      "Pide certificaciones a tus contratantes anteriores con objeto, valor, plazo, fechas y actividades ejecutadas. Un trabajo sin papel no se puede evaluar.",
    chips: ["2 a 4 semanas"],
  },
  exp_cero: {
    id: "exp_cero",
    severidad: "soft",
    absoluto: false,
    titulo: "Entra como subcontratista o en unión temporal",
    detalle:
      "Sin experiencia certificable, la vía es acompañar a alguien que ya la tenga. El primer contrato ejecutado se convierte en la certificación del siguiente.",
    chips: ["Estrategia de entrada"],
  },
  fin_atraso: {
    id: "fin_atraso",
    severidad: "soft",
    absoluto: false,
    titulo: "Pon al día los estados financieros",
    detalle:
      "Un balance de hace dos años no dice nada sobre tu capacidad actual, y es lo primero que mira el área financiera.",
    chips: ["Contador", "2 a 4 semanas"],
  },
  flujo: {
    id: "flujo",
    severidad: "soft",
    absoluto: false,
    titulo: "Consigue el cupo de crédito antes de necesitarlo",
    detalle:
      "Negociar financiación con un contrato ya firmado y el reloj corriendo sale más caro. Habla con tu banco antes de presentarte.",
    chips: ["2 a 4 semanas"],
  },
  tec_ras: {
    id: "tec_ras",
    severidad: "soft",
    absoluto: false,
    titulo: "Suma experiencia sectorial al equipo técnico",
    detalle:
      "Tener la matrícula no basta si el objeto es acueducto o alcantarillado: quien evalúa busca a alguien que conozca el reglamento técnico del sector.",
    chips: ["1 a 2 meses"],
  },
  tec_no: {
    id: "tec_no",
    severidad: "soft",
    absoluto: false,
    titulo: "Identifica el ingeniero antes de la invitación",
    detalle:
      "No hace falta nómina desde el primer día: una carta de compromiso con hoja de vida y matrícula vigente suele bastar. Buscarlo cuando ya salió la invitación es tarde.",
    chips: ["1 a 2 semanas"],
  },
  puerta: {
    id: "puerta",
    severidad: "soft",
    absoluto: false,
    titulo: "Preséntate al área técnica",
    detalle:
      "Escribe al área que ejecuta, no solo a compras: pide una reunión corta para presentar qué hace tu empresa. En contratación privada eso es parte del proceso, no un favor.",
    chips: ["Esta semana"],
  },
};

export const PLAN_SIN_PENDIENTES_ESP = {
  titulo: "No tienes pendientes que dependan de ti",
  detalle:
    "Estás en condiciones de competir. Lo que sigue es constancia: mantén el registro actualizado, revisa las publicaciones de las empresas de tu zona y cultiva la relación con el área técnica. Y verifica aparte lo que este diagnóstico no cubre.",
  chips: ["Esta semana"],
} as const;

/**
 * Con `listas_si` el cuestionario ya tiene un bloqueante absoluto, así que este
 * titular deja de ser opcional — hay un test del registro que lo exige.
 */
export const VEREDICTO_BLOQUEADO_ESP: TextoVeredicto = {
  antetitulo: "Bloqueado",
  titulo: "Hay un reporte que te deja fuera, aunque el resto esté listo.",
  texto:
    "Tu puntaje refleja todo lo que ya tienes resuelto y este bloqueo no lo baja. Pero mientras figures en una lista restrictiva, el registro queda suspendido y ninguna oferta avanza. Lo encuentras primero en tu plan de acción.",
};

export const VEREDICTOS_ESP: Readonly<Record<BandaPreparacion, TextoVeredicto>> = {
  listo: {
    antetitulo: "Listo",
    titulo: "Estás en condiciones de competir por estos contratos.",
    texto:
      "Tienes lo que estas empresas miran: registro, experiencia certificable y espalda financiera. Lo que falta es presencia — que el área técnica sepa que existes antes de que salga la próxima invitación.",
  },
  casi: {
    antetitulo: "Casi",
    titulo: "Te faltan uno o dos trámites para entrar a competir.",
    texto:
      "La base está. Resuelve lo que aparece abajo en ese orden y en unas semanas puedes responder una invitación sin improvisar nada.",
  },
  en_camino: {
    antetitulo: "En camino",
    titulo: "Empieza por el registro mientras completas el resto.",
    texto:
      "Inscribirte en el registro de proveedores no cuesta y es lo que te pone en la lista. Mientras tanto, ordena la experiencia y los estados financieros: son lo que te van a pedir cuando llegue la invitación.",
  },
  inicio: {
    antetitulo: "Punto de partida",
    titulo: "El camino es más corto que en la contratación estatal.",
    texto:
      "Aquí no hay RUP que tramitar ni escalera que subir. El primer paso es el registro de proveedores, y desde ahí todo lo demás se construye contrato a contrato.",
  },
};

/**
 * Lo que este cuestionario NO cubre. Va junto al veredicto, no en la letra
 * pequeña: un "listo" sin esta línea sería una promesa que las seis preguntas
 * no pueden sostener.
 */
export const ADVERTENCIA_ESP =
  "Este diagnóstico no cubre el régimen de inhabilidades e incompatibilidades ni el pago de aportes a seguridad social. Verifícalos aparte antes de presentar cualquier oferta, por alto que sea tu puntaje aquí.";

export const FACTS_ESP: readonly Fact[] = [
  {
    titulo: "El RUP, depende",
    texto: "Unas empresas lo exigen y otras no: lo decide el manual de cada una, no la ley",
  },
  {
    titulo: "Sin escalera",
    texto: "No hay mínima ni menor cuantía: los topes los fija el manual de cada empresa",
  },
  {
    titulo: "Con registro",
    texto: "Casi todas invitan solo a proveedores ya inscritos, y inscribirse es gratis",
  },
];

export const PORTADA_ESP = {
  antetitulo: "8 preguntas · 3 minutos",
  titulo: "Averigua si ya puedes venderle a una empresa de servicios públicos.",
  tituloEnfasis: "ya puedes",
  lede: "Los acueductos y las empresas de aseo contratan con reglas propias, no con las de una alcaldía. Esto te dice qué miran, qué te falta y por dónde se entra.",
  cta: "Empezar el diagnóstico →",
} as const;

export const MITOS_ESP: readonly Mito[] = [
  {
    afirmacion: "Si contratan por derecho privado, es a dedo.",
    respuesta:
      "Contratan con su propio manual, aprobado por su junta directiva y de obligatorio cumplimiento para ellas. Que no sea la Ley 80 no significa que no haya reglas.",
  },
  {
    afirmacion: "Con estas empresas el RUP no sirve de nada.",
    respuesta:
      "Depende de cuál. ACUAVALLE lo exige en sus requisitos de capacidad; el Acueducto de Bogotá y EPM piden su propio registro de proveedores. Lo que siempre aplica es inscribirse donde esa empresa te pida.",
  },
  {
    afirmacion: "Esos contratos son solo para empresas de Bogotá o Medellín.",
    respuesta:
      "Hay cientos de empresas de servicios públicos municipales contratando obra y suministro todo el año, con cuantías que una empresa pequeña ejecuta sin problema.",
  },
  {
    afirmacion: "Hablar con la empresa antes de la invitación es tráfico de influencias.",
    respuesta:
      "Presentar tu portafolio al área técnica es actividad comercial normal, y en contratación privada es como se construye la lista de invitados.",
  },
];

export const DISCLAIMER_ESP =
  "Este diagnóstico es una guía de preparación, no un concepto jurídico. Las empresas de servicios públicos contratan bajo derecho privado (Ley 142 de 1994) y cada una fija sus modalidades, topes y requisitos en su propio manual de contratación: consúltalo siempre antes de presentar una oferta.";

/** El cuestionario como unidad. Sin `escalon` ni `estadoRup`: la Ley 142 no los tiene. */
export const CUESTIONARIO_CO_ESP_V1: Cuestionario = {
  version: VERSION_CO_ESP_V1,
  categorias: CATEGORIAS_ESP,
  preguntas: PREGUNTAS_ESP,
  remedios: REMEDIOS_ESP,
  veredictos: VEREDICTOS_ESP,
  portada: PORTADA_ESP,
  facts: FACTS_ESP,
  planSinPendientes: PLAN_SIN_PENDIENTES_ESP,
  mitos: MITOS_ESP,
  disclaimer: DISCLAIMER_ESP,
  veredictoBloqueado: VEREDICTO_BLOQUEADO_ESP,
  advertencia: ADVERTENCIA_ESP,
  otraVariante: {
    texto: "¿Le vendes a una alcaldía o a una gobernación? Ese diagnóstico es el otro.",
    version: "co-apsb-v1",
  },
  // Sin veredictoBloqueado: no declara ningún remedio absoluto, porque las dos
  // preguntas que los producían están pendientes de revisión jurídica.
};
