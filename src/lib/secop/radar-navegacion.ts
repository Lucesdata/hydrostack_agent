/**
 * La navegación con teclado de la lista del Radar, pura para poder probarla
 * sin navegador (las pruebas corren en Node) y para que el componente de
 * cliente no arrastre nada de la base al importarla.
 */

/**
 * El vecino de `actual` en `ids` al moverse `paso` posiciones, sin dar la
 * vuelta: en el borde se queda donde está. Es la regla de ↑/↓ en la lista.
 */
export function vecino(ids: string[], actual: string | null, paso: number): string | null {
  if (ids.length === 0) return null;
  const i = actual === null ? -1 : ids.indexOf(actual);
  if (i === -1) return ids[0];
  return ids[Math.min(ids.length - 1, Math.max(0, i + paso))];
}

/** Ancho desde el que la vitrina es Radar (lista y panel). Debajo, la tarjeta lleva a la ficha. */
export const ANCHO_RADAR = 1100;

/**
 * ¿Este clic lo atiende el panel? Solo el clic principal sin teclas: con Ctrl,
 * Cmd, Mayúsculas o el botón central, el navegador abre la ficha como siempre.
 */
export function clicDelPanel(e: {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  return e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;
}
