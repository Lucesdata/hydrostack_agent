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
.vt-rejilla > li { display: flex; min-width: 0; position: relative; }
/* «☆ Seguir», encima de la tarjeta en su esquina inferior izquierda, a la
   altura del pie («Ver ficha →» va a la derecha). */
.vt-seguir { position: absolute; left: 20px; bottom: 14px; }
.vt-rejilla .fc-pie { min-height: 30px; }
.vt-rejilla > li > a { flex: 1; min-width: 0; }

.vt-vacio { font: 14px var(--sans); color: var(--text-muted); padding: 32px 0; }
.vt-vacio-accion { display: inline-block; margin-top: 10px; font: 600 13px var(--mono); color: var(--accent); }

.vt-pag { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 26px; }
.vt-pag-info { font: 12px var(--mono); color: var(--text-muted); }
.vt-pag-link { font: 600 13px var(--mono); color: var(--accent); }

/* Radar (RadarVitrina): desde 1100 px, lista a la izquierda y detalle fijo a la
   derecha. Debajo, el panel no existe y la rejilla es la de siempre. */
.vr-panel { display: none; }
.vr-oculto { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (min-width: 1100px) {
  .vr { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 20px; align-items: start; }
  .vr .vt-rejilla { grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .vr .fc { padding: 14px 18px; }
  .vr .fc:hover { transform: none; }
  .vr .fc[data-elegida] { border-color: var(--accent); box-shadow: inset 4px 0 0 var(--accent); }
  /* Aquí un clic elige, no abre: «Ver ficha →» mentiría. Abrir está en el panel. */
  .vr .fc-pie { visibility: hidden; }
  .vr .vt-seguir { left: 18px; bottom: 10px; }
  .vr-panel {
    display: block;
    position: sticky;
    top: calc(var(--nav-h) + 12px);
    max-height: calc(100vh - var(--nav-h) - 24px);
    overflow: auto;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--card);
  }
}
.vr-cab { padding: 18px 20px 14px; display: grid; gap: 6px; border-bottom: 1px solid var(--border); }
.vr-meta { margin: 0; display: flex; flex-wrap: wrap; gap: 4px 14px; font: 12px var(--sans); color: var(--text-muted); }
.vr-tipo { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: var(--text-primary); }
.vr-punto { width: 9px; height: 9px; border-radius: 50%; }
.vr-punto--otros { border: 1.5px dashed var(--text-muted); }
.vr-titulo { margin: 0; font: 700 19px/1.3 var(--sans); color: var(--text-primary); text-wrap: balance; }
.vr-entidad { margin: 0; font: 13px var(--sans); color: var(--text-muted); }
.vr-id { font-family: var(--mono); font-size: 12px; }
.vr-acciones { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; margin-top: 6px; }
.vr-abrir {
  font: 600 14px var(--sans); color: #fff; background: var(--accent-fill);
  border-radius: var(--radius-md); padding: 8px 14px;
}
.vr-abrir:hover { background: var(--accent-fill-hover); }
.vr-secop { font: 600 13px var(--sans); color: var(--accent); }

/* Encaje con el perfil (EncajeVitrina). Tinte al 6 %, como las pastillas del
   canal de la ficha: al 10 % el verde y el ámbar no llegaban a AA. */
.ve-linea {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  font: 600 12.5px var(--sans);
  border-radius: 6px;
  padding: 6px 10px;
  min-height: 30px;
}
.ve-linea--si { color: var(--success); background: color-mix(in srgb, var(--success) 6%, transparent); }
.ve-linea--revisar { color: var(--warning); background: color-mix(in srgb, var(--warning) 6%, transparent); }
.ve-linea--no { color: var(--danger); background: color-mix(in srgb, var(--danger) 6%, transparent); }
.ve-linea--cargando { background: var(--surface-alt); }
.ve-barras { display: inline-flex; gap: 3px; flex: none; }
.ve-barras i { width: 12px; height: 5px; border-radius: 2px; background: currentColor; opacity: .22; }
.ve-barras i.ve-on { opacity: 1; }
.ve-aviso {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;
  margin: 0 0 16px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
}
.ve-aviso-texto { margin: 0; font: 14px/1.45 var(--sans); color: var(--text-primary); max-width: 64ch; }
.ve-aviso-boton {
  font: 600 14px var(--sans); color: #fff; background: var(--accent-fill);
  border: 0; border-radius: var(--radius-md); padding: 9px 16px; cursor: pointer;
}
.ve-aviso-boton:hover { background: var(--accent-fill-hover); }
.ve-aviso-boton:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* «Para ti» (EstanteParaTi). Pastillas de estado al 6 % de su color, como la
   línea de encaje: medidas en contraste.test.ts. */
.pt { margin: 0 0 18px; border: 1px solid var(--border); border-radius: 10px; background: var(--card); }
.pt-resumen { cursor: pointer; padding: 12px 16px; font: 700 16px var(--sans); color: var(--text-primary); }
.pt-resumen:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.pt-cuenta { font: 400 14px var(--sans); color: var(--text-muted); }
.pt-vacio { margin: 0; padding: 0 16px 14px; font: 14px var(--sans); color: var(--text-muted); }
.pt-lista { list-style: none; margin: 0; padding: 0 16px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.pt-tarjeta {
  display: flex; flex-direction: column; gap: 4px; height: 100%;
  padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
  color: inherit; background: var(--bg);
}
.pt-tarjeta:hover { border-color: var(--accent); }
.pt-tarjeta:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.pt-estado { align-self: flex-start; font: 600 11px var(--sans); padding: 2px 8px; border-radius: 999px; }
.pt-estado--si { color: var(--success); background: color-mix(in srgb, var(--success) 6%, transparent); }
.pt-estado--revisar { color: var(--warning); background: color-mix(in srgb, var(--warning) 6%, transparent); }
.pt-estado--no { color: var(--danger); background: color-mix(in srgb, var(--danger) 6%, transparent); }
.pt-estado--dato { color: var(--text-muted); background: var(--surface-alt); }
.pt-titulo { font: 600 14px/1.3 var(--sans); color: var(--text-primary); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.pt-meta { font: 12px var(--sans); color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pt-valor { margin-top: auto; padding-top: 4px; font: 700 15px var(--sans); color: var(--text-primary); font-variant-numeric: tabular-nums; }
.pt-todas { display: inline-block; margin: 10px 16px 14px; font: 600 13px var(--sans); color: var(--accent); }
@media (max-width: 1023px) { .pt-lista { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .pt-lista { grid-template-columns: minmax(0, 1fr); } }

/* «Avisarme de procesos nuevos así» (AlertaVitrina). */
.va { border: 1px solid var(--border); border-radius: 8px; background: var(--card); }
.va-resumen { cursor: pointer; padding: 10px 14px; font: 600 14px var(--sans); color: var(--accent); }
.va-resumen:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.va-form, .va-hecho { padding: 0 14px 14px; margin: 0; display: grid; gap: 8px; font: 14px/1.5 var(--sans); color: var(--text-primary); }
.va-texto, .va-nota { margin: 0; }
.va-nota, .va-ayuda { font-size: 13px; color: var(--text-muted); }
.va-lista { margin: 0; padding-left: 20px; display: grid; gap: 2px; }
.va-nombre { display: grid; gap: 4px; font: 600 12px var(--sans); color: var(--text-muted); max-width: 420px; }
.va-acciones { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
.va-boton {
  font: 600 14px var(--sans); color: #fff; background: var(--accent-fill);
  border: 0; border-radius: var(--radius-md); padding: 8px 16px; cursor: pointer;
}
.va-boton:hover { background: var(--accent-fill-hover); }
.va-boton:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.va-error { margin: 0; font-size: 13px; color: var(--danger); }

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
@media (max-width: 640px) { .vt-seguir { left: 16px; } .vt-rejilla { grid-template-columns: minmax(0, 1fr); } .vt-tabs { overflow-x: auto; } }
`;
