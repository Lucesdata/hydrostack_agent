/**
 * Las rutas que el home promete, con la capacidad que cada una exige.
 *
 * Existe porque el home llegó a prometer "Prueba sin cuenta · Resultado en 2
 * minutos" enlazando a /licitaciones, que no es ninguna de las dos cosas. La
 * promesa y la puerta vivían en sitios distintos y se separaron.
 *
 * Aquí van juntas, y dos tests las vigilan: `enlaces.test.ts` comprueba que
 * cada `href` existe como página real, y `acceso.test.ts` que cada `etiqueta`
 * dice lo mismo que `NIVEL_MINIMO` en politica.ts. Añadir una sección al home
 * sin pasar por aquí es saltarse las dos verificaciones.
 */

/** Lo que el usuario lee. Un nivel, una frase. */
export const ETIQUETA_POR_NIVEL = {
  anonimo: "sin cuenta",
  gratis: "cuenta gratuita",
  pro: "plan pro",
};

export const SECCIONES_HOME = [
  { id: "diagnostico", href: "/diagnostico", capacidad: "diagnostico", etiqueta: "sin cuenta" },
  { id: "explorar", href: "/licitaciones", capacidad: "explorar", etiqueta: "sin cuenta" },
  { id: "informe", href: "/informe", capacidad: "explorar", etiqueta: "sin cuenta" },
  {
    id: "comparar",
    href: "/licitaciones/comparar",
    capacidad: "explorar",
    etiqueta: "sin cuenta",
  },
  {
    id: "compradores",
    href: "/licitaciones/entidades",
    capacidad: "explorar",
    etiqueta: "sin cuenta",
  },
  {
    id: "veredicto",
    href: "/licitaciones",
    capacidad: "veredicto_resumen",
    etiqueta: "sin cuenta",
  },
  { id: "perfil", href: "/perfil", capacidad: "perfil_guardar", etiqueta: "cuenta gratuita" },
  // El análisis de pliego ya no tiene página: vive en la §4 de cada ficha
  // (2026-09-27). Sigue en el catálogo para que /precios y /cuenta lo nombren en
  // su nivel; su puerta son las fichas.
  { id: "pliego", href: "/licitaciones", capacidad: "pliego_extraer", etiqueta: "cuenta gratuita" },
  { id: "filtros", href: "/mis-filtros", capacidad: "filtros", etiqueta: "cuenta gratuita" },
  {
    id: "diagnostico-historial",
    href: "/diagnostico/historial",
    capacidad: "diagnostico_historial",
    etiqueta: "cuenta gratuita",
  },
  {
    id: "coincidencias",
    href: "/mis-coincidencias",
    capacidad: "coincidencias",
    etiqueta: "cuenta gratuita",
  },
  { id: "alertas", href: "/cuenta", capacidad: "alertas", etiqueta: "cuenta gratuita" },
  // Como `pliego`: sin página propia desde el 2026-09-27. El historial de cada
  // rival se abre en la §7 de la ficha; su puerta son las fichas.
  {
    id: "competidores",
    href: "/licitaciones",
    capacidad: "competidores",
    etiqueta: "cuenta gratuita",
  },
  { id: "precios", href: "/precios", capacidad: "explorar", etiqueta: "sin cuenta" },
];

/**
 * Busca una sección por id y lanza un error legible si no existe.
 *
 * Antes cada componente repetía `SECCIONES_HOME.find((s) => s.id === id)` y
 * desreferenciaba el resultado sin comprobarlo: un id mal escrito reventaba
 * en producción con un "Cannot read properties of undefined" que no dice
 * cuál id faltaba. Con `ruta()` el error nombra el id y el lugar donde
 * buscar (este archivo), en vez de un componente al azar.
 */
export function ruta(id) {
  const encontrada = SECCIONES_HOME.find((s) => s.id === id);
  if (!encontrada) {
    throw new Error(`ruta(): "${id}" no existe en SECCIONES_HOME (seccionesHome.js)`);
  }
  return encontrada;
}

/**
 * El nombre legible de cada sección.
 *
 * Vivía como `ETIQUETAS` dentro de `S6Footer.jsx`, donde solo el pie podía
 * leerlo. `S7Acceso.jsx` necesita exactamente los mismos strings, y copiarlos
 * habría dejado dos listas que se desincronizan en el primer renombrado.
 *
 * Los asistentes, `/auditoria`, `/soluciones` y `/nosotros` salieron del
 * catálogo el 2026-09-27 (plan «la ficha como centro»). `pliego` y
 * `competidores` se quedaron, pero apuntan a las fichas: sus páginas también
 * salieron y viven en la §4 y la §7 de cada una.
 *
 * Una sección sin entrada aquí no se lista en ningún índice. Hoy la única es
 * `veredicto`, que no es una página aparte sino una parte de /licitaciones.
 */
export const NOMBRE_POR_ID = {
  diagnostico: "Diagnóstico",
  // "Fichas de procesos" y no "Licitaciones": decisión C del 2026-09-21
  // (AUDITORIA-SPECS-LANDING-MAPA §9). La ruta /licitaciones se conserva.
  explorar: "Fichas de procesos",
  compradores: "Quién compra",
  comparar: "Comparar departamentos",
  informe: "Informe mensual",
  coincidencias: "Mis coincidencias",
  filtros: "Mis filtros",
  competidores: "Competidores en cada ficha",
  // `alertas` estuvo sin nombre desde 2026-09-10 para que no apareciera en
  // ningún índice: el envío diario no se entrega (falta AUTH_RESEND_KEY en
  // Vercel, PENDIENTES §0 y §21) y anunciarlo prometía algo que no ocurre.
  //
  // Recupera el nombre el 2026-09-15 porque el rediseño lleva /cuenta al nav y
  // al pie, y porque la promesa ya no queda sin matizar: la propia página dice,
  // arriba del formulario, que el aviso está construido y se activará cuando el
  // envío quede configurado. El matiz está donde alguien va a actuar, que es
  // mejor sitio que la ausencia del enlace. Lo que no se puede es volver a
  // prometerlo como pilar de la portada; eso sigue vetado hasta el §0.
  alertas: "Alertas",
  precios: "Precios y acceso",
  perfil: "Mi perfil RUP",
  "diagnostico-historial": "Historial de diagnóstico",
  pliego: "Análisis de pliego en cada ficha",
};

/**
 * El nav principal. Dos destinos y sin numerar: las fichas y las alertas.
 * Eran cuatro hasta que salieron /nosotros y /pliego (2026-09-27).
 *
 * Antes el navbar declaraba sus cinco pestañas en `Navbar.js` y el pie otras
 * cuatro distintas en `S6Footer.jsx`: dos listas, ningún criterio común y un
 * usuario que veía una navegación arriba y otra abajo. Ahora las dos salen de
 * aquí, que es el mismo catálogo que `enlaces.test.ts` verifica contra `app/`.
 *
 * `Diagnóstico` baja al pie: es una puerta de entrada de campaña, no un
 * destino al que se vuelve. `Alertas` (/cuenta) sube, porque hasta ahora
 * solo se llegaba a ella desde el propio correo de alertas — o sea, solo si ya
 * la tenías.
 */
export const NAV_PRINCIPAL = ["explorar", "alertas"];

/**
 * Las columnas del pie. Incluye todo lo que el nav deja fuera, para que ninguna
 * ruta con nombre quede sin una puerta visible.
 */
export const COLUMNAS_PIE = [
  {
    grupo: "Explorar",
    ids: ["explorar", "compradores", "comparar", "informe", "diagnostico"],
  },
  { grupo: "Tu cuenta", ids: ["coincidencias", "filtros", "alertas"] },
  { grupo: "En cada ficha", ids: ["competidores", "pliego"] },
  { grupo: "AquaLicita", ids: ["precios"] },
];

/**
 * El menú de usuario: lo que solo existe con sesión.
 *
 * Era la TERCERA lista de navegación declarada a mano, en `Navbar.js`, y la
 * única que enlazaba /perfil y /diagnostico/historial — dos rutas que ni
 * siquiera estaban en este catálogo, así que `enlaces.test.ts` nunca comprobó
 * que existieran. Ahora salen de aquí como las demás.
 */
export const MENU_CUENTA = [
  "perfil",
  "coincidencias",
  "filtros",
  "diagnostico-historial",
  "alertas",
];

/**
 * Las secciones nombrables agrupadas por nivel de acceso, en el orden de
 * `ETIQUETA_POR_NIVEL` (anónimo → gratis → pro).
 *
 * Es una función pura exportada y no un `.filter()` dentro del render de
 * `S7Acceso.jsx` a propósito: el entorno de vitest de este repo es "node",
 * sin jsdom, así que un componente montado no se puede testear pero esto sí.
 * El criterio de aceptación de la sección ("añadir una ruta con nombre la
 * hace aparecer en su columna sin tocar el componente") deja de ser una
 * promesa y pasa a estar en `src/__tests__/landing/nombres.test.ts`.
 *
 * Un nivel sin ninguna sección no se devuelve: una columna vacía diría que
 * existe algo que no existe. Es el caso de `pro` desde el 2026-09-27, cuando el
 * análisis de pliego pasó a gratis; su columna vuelve sola cuando algo sea de
 * pago.
 */
export function seccionesPorNivel() {
  return Object.entries(ETIQUETA_POR_NIVEL)
    .map(([nivel, etiqueta]) => ({
      nivel,
      etiqueta,
      secciones: SECCIONES_HOME.filter((s) => s.etiqueta === etiqueta && NOMBRE_POR_ID[s.id]).map(
        (s) => ({ ...s, nombre: NOMBRE_POR_ID[s.id] })
      ),
    }))
    .filter((g) => g.secciones.length > 0);
}
