/**
 * Estilos del semáforo de cinco compuertas.
 *
 * Los colores de estado salen de los tokens semánticos, que desde 2026-09-15
 * están en el escalón -700 y cumplen AA como texto de 11px — antes no.
 *
 * El punto de `sin datos` usa `--text-muted` y NO `--border`, que es lo que hace
 * el componente viejo (`clr-elig-seg--unknown` en SecopExplorer): ahí el gris de
 * borde da 1,26:1 contra la tarjeta cuando un elemento no textual exige 3:1, y
 * el resultado es que UNKNOWN —el estado más frecuente de la compuerta de
 * habilitación— se dibuja como nada. Aquí da 6,99:1 y se ve.
 */
export const ESTILOS_SEMAFORO = `
.sf{ display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
.sf--bloque{ flex-direction: column; align-items: stretch; gap: 10px; }

.sf-item{ display: flex; align-items: center; gap: 6px; min-width: 0; }
.sf--bloque .sf-item{ align-items: baseline; gap: 10px; }

.sf-punto{
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  /* El anillo despega el punto de la superficie cuando el color es claro y
     evita que un estado se confunda con una viñeta decorativa. */
  box-shadow: 0 0 0 2px var(--surface-elevated);
}
.sf-punto--pass{ background: var(--success); }
.sf-punto--warn{ background: var(--warning); }
.sf-punto--fail{ background: var(--danger); }
.sf-punto--unknown{ background: var(--text-muted); }
.sf-punto--dato{ background: var(--accent); }

.sf-etiqueta{
  font: 11px var(--font-mono); color: var(--text-primary);
  white-space: nowrap;
}
.sf--bloque .sf-etiqueta{ font-size: 12px; min-width: 96px; }

/* La palabra del estado. Nunca se omite: sin ella el color viaja solo, y verde
   y ámbar difieren un 4% en luminancia — para quien no separa esos tonos, un
   punto de color es un punto de color. */
.sf-palabra{
  font: 10px var(--font-mono); color: var(--text-muted);
  text-transform: uppercase; letter-spacing: .05em; white-space: nowrap;
}
.sf-explicacion{ font: 12.5px/1.5 var(--font-sans); color: var(--text-muted); }
.sf--bloque .sf-explicacion{ flex: 1; }

.sf-pide-cuenta{
  font: 12.5px var(--font-sans); color: var(--accent); text-decoration: none;
}
.sf-pide-cuenta:hover{ text-decoration: underline; }

.sf-nota{
  font: 12px/1.6 var(--font-sans); color: var(--text-muted);
  border-top: 1px dashed var(--border); padding-top: 10px; margin: 4px 0 0;
}

/* En pantalla pequeña la línea pasa a rejilla de cinco. Es un cambio de
   disposición, no de lógica: el componente recibe lo mismo. */
@media (max-width: 720px){
  .sf--linea{ display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 8px 12px; }
}
`;
