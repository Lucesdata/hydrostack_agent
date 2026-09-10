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
  {
    id: "veredicto",
    href: "/licitaciones",
    capacidad: "veredicto_resumen",
    etiqueta: "sin cuenta",
  },
  { id: "filtros", href: "/mis-filtros", capacidad: "filtros", etiqueta: "cuenta gratuita" },
  {
    id: "coincidencias",
    href: "/mis-coincidencias",
    capacidad: "coincidencias",
    etiqueta: "cuenta gratuita",
  },
  { id: "alertas", href: "/cuenta", capacidad: "alertas", etiqueta: "cuenta gratuita" },
  {
    id: "competidores",
    href: "/competidores",
    capacidad: "competidores",
    etiqueta: "cuenta gratuita",
  },
  { id: "auditoria", href: "/auditoria", capacidad: "filtros", etiqueta: "cuenta gratuita" },
  { id: "pliego", href: "/pliego", capacidad: "pliego_extraer", etiqueta: "plan pro" },
  {
    id: "asistente-ejecucion",
    href: "/asistente/ejecucion",
    capacidad: "asistentes",
    etiqueta: "plan pro",
  },
  {
    id: "asistente-operacion",
    href: "/asistente/operacion",
    capacidad: "asistentes",
    etiqueta: "plan pro",
  },
  { id: "soluciones", href: "/soluciones", capacidad: "explorar", etiqueta: "sin cuenta" },
  { id: "nosotros", href: "/nosotros", capacidad: "explorar", etiqueta: "sin cuenta" },
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
