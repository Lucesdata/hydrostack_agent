/**
 * Estilos de la lista densa de procesos. Se inyectan una vez por página, con el
 * mismo patrón que el resto del producto (`SecopExplorer`, `mis-coincidencias`).
 *
 * Todo el color pasa por tokens semánticos — los alias que introdujo el
 * rediseño de 2026-09 — para que un cambio de paleta no tenga que buscar
 * literales aquí dentro. La fila mide 84px en escritorio, como pide el spec.
 */
export const ESTILOS_LISTA = `
.lp-lista{ list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--border); }
.lp-fila{ border-bottom: 1px solid var(--border); }
.lp-fila-link{
  display: grid;
  /* La columna del semáforo mide 268px: las cinco compuertas fluyen dentro y
     envuelven en dos o tres líneas, que es lo que cabe en una fila de 84px sin
     robarle ancho al objeto —que es lo que de verdad se lee. */
  grid-template-columns: 124px minmax(0, 1fr) 300px 100px;
  gap: 18px; align-items: center;
  min-height: 84px; padding: 14px 16px;
  text-decoration: none; color: inherit;
  transition: background .15s, box-shadow .15s;
}
.lp-fila-link:hover{
  background: var(--surface-elevated);
  box-shadow: 0 1px 3px rgba(10,31,28,.07), 0 0 0 1px var(--border);
}
.lp-fila-link:focus-visible{ outline: 2px solid var(--focus-ring); outline-offset: -2px; }

.lp-col-estado{ display: flex; flex-direction: column; gap: 5px; }
.lp-estado, .lp-tipo{
  font: 10px var(--font-mono); text-transform: uppercase; letter-spacing: .06em;
  align-self: flex-start; padding: 2px 7px; white-space: nowrap;
}
.lp-estado{ color: var(--accent); background: var(--accent-faint); border: 1px solid var(--accent-soft); }
.lp-tipo{ color: var(--text-muted); border: 1px solid var(--border); }

.lp-col-objeto{ display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.lp-objeto{
  font: 500 14px/1.4 var(--font-sans); color: var(--text-primary);
  /* Dos líneas y corte: el objeto del SECOP llega en mayúsculas y puede medir
     300 caracteres. Sin tope, una sola fila empuja a las demás fuera de vista. */
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}
.lp-meta{ font: 12px var(--font-sans); color: var(--text-muted); }

.lp-col-semaforo{ min-width: 0; }
.lp-col-valor{ font: 500 14px var(--font-mono); color: var(--text-primary); text-align: right; }
.lp-sin-dato{ font: 11px var(--font-sans); color: var(--text-muted); font-style: italic; }

.lp-col-fecha{ display: flex; flex-direction: column; gap: 2px; text-align: right; }
.lp-fecha-valor{ font: 12px var(--font-mono); color: var(--text-primary); }
.lp-fecha-label{
  font: 9px var(--font-mono); color: var(--text-muted);
  text-transform: uppercase; letter-spacing: .07em;
}

.lp-vacio{ padding: 48px 16px; text-align: center; color: var(--text-muted); font: 14px var(--font-sans); }

/* Paginación */
.lp-pag{ display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 16px; }
.lp-pag-info{ font: 12px var(--font-mono); color: var(--text-muted); }
.lp-pag-links{ display: flex; gap: 8px; }
.lp-pag-link{
  font: 12px var(--font-mono); padding: 7px 13px; text-decoration: none;
  color: var(--accent); border: 1px solid var(--border); background: var(--surface-elevated);
}
.lp-pag-link:hover{ border-color: var(--accent); }
.lp-pag-link[aria-disabled="true"]{ color: var(--text-muted); pointer-events: none; opacity: .5; }

/* Cabecera de faceta */
.lp-cab{ padding: 40px 16px 20px; }
.lp-cab-migas{ font: 11px var(--font-mono); color: var(--text-muted); text-transform: uppercase; letter-spacing: .07em; margin-bottom: 12px; }
.lp-cab-migas a{ color: var(--accent); text-decoration: none; }
.lp-cab-migas a:hover{ text-decoration: underline; }
.lp-cab-h1{ font: 600 30px/1.15 var(--font-sans); color: var(--text-primary); margin: 0 0 10px; }
.lp-cab-desc{ font: 15px/1.6 var(--font-sans); color: var(--text-muted); margin: 0; max-width: 62ch; }
.lp-cab-conteo{ font: 13px var(--font-mono); color: var(--text-primary); margin-top: 14px; }

/* La fila densa es de escritorio. Por debajo de 900px se apila; el spec de
   rediseño fija el diseño móvil aparte, así que esto es solo el mínimo para que
   no se rompa mientras tanto. */
@media (max-width: 900px){
  .lp-fila-link{ grid-template-columns: 1fr; gap: 10px; padding: 16px; }
  .lp-col-valor, .lp-col-fecha{ text-align: left; }
  .lp-col-fecha{ flex-direction: row; gap: 6px; align-items: baseline; }
  .lp-col-estado{ flex-direction: row; }
}
`;
