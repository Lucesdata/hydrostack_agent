export const ESTILOS_VITRINA = `
.vt-cab { margin-bottom: 20px; }
.vt-h1 { font: 700 clamp(24px, 3vw, 32px)/1.15 var(--sans); color: var(--text-primary); margin: 0 0 6px; }
.vt-apoyo { font: 14px var(--sans); color: var(--text-muted); margin: 0; }
.vt-conteo { font: 12px var(--mono); color: var(--text-muted); margin: 10px 0 0; }

.vt-tabs { display: flex; gap: 8px; margin: 18px 0 22px; border-bottom: 1px solid var(--border); }
.vt-tab {
  font: 600 13px var(--sans);
  padding: 9px 14px;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.vt-tab[aria-current="page"] { color: var(--accent); border-bottom-color: var(--accent); }

/* minmax(0, 1fr) y min-width: 0: con 1fr a secas, una entidad larga (que va en
   una línea con elipsis) ensanchaba su columna y la rejilla se salía por la
   derecha. */
.vt-rejilla { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; list-style: none; margin: 0; padding: 0; }
.vt-rejilla > li { display: flex; min-width: 0; }
.vt-rejilla > li > a { flex: 1; min-width: 0; }

.vt-vacio { font: 14px var(--sans); color: var(--text-muted); padding: 32px 0; }
.vt-vacio-accion { display: inline-block; margin-top: 10px; font: 600 13px var(--mono); color: var(--accent); }

.vt-pag { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 26px; }
.vt-pag-info { font: 12px var(--mono); color: var(--text-muted); }
.vt-pag-link { font: 600 13px var(--mono); color: var(--accent); }

/* Buscador y filtros (FiltrosVitrina): lo que antes eran Explorar y Descubrir. */
.vf { margin: 0 0 18px; display: grid; gap: 12px; }
.vf-form {
  display: grid;
  grid-template-columns: minmax(0, 2fr) repeat(4, minmax(0, 1fr)) auto;
  gap: 10px;
  align-items: end;
}
.vf-campo { display: grid; gap: 4px; min-width: 0; }
.vf-campo .clr-input, .vf-campo .clr-select { width: 100%; min-width: 0; }
.vf-etiqueta { font: 600 11px var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--text-muted); }
.vf-buscar {
  font: 600 14px var(--sans);
  color: #fff;
  background: var(--accent-fill);
  border: 0;
  border-radius: var(--radius-md);
  padding: 9px 18px;
  cursor: pointer;
}
.vf-buscar:hover { background: var(--accent-fill-hover); }
.vf-buscar:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.vf-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.vf-atajos { display: contents; }
.vf-chip {
  font: 13px var(--sans);
  color: var(--text-primary);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 12px;
}
.vf-chip:hover { border-color: var(--accent); color: var(--accent); }
.vf-chip--activo { border-color: var(--accent); color: var(--accent-deep, var(--accent)); font-weight: 600; background: var(--surface-alt); }
.vf-limpiar { font: 600 12px var(--mono); color: var(--accent); margin-right: 6px; }
.vf-oculto { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
/* Bajo 1024: búsqueda y botón a lo ancho, los cuatro selectores de dos en dos
   (en una columna el formulario ocupaba casi toda la pantalla del celular). */
@media (max-width: 1023px) {
  .vf-form { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .vf-campo--q, .vf-buscar { grid-column: 1 / -1; }
}

@media (max-width: 1023px) { .vt-rejilla { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .vt-rejilla { grid-template-columns: minmax(0, 1fr); } .vt-tabs { overflow-x: auto; } }
`;
