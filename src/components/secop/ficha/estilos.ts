/** Estilos de la ficha pública. Todo el color por tokens semánticos. */
export const ESTILOS_FICHA = `
.fi{ max-width: 920px; margin: 0 auto; padding: 0 16px 72px; }
.fi-migas{ font: 11px var(--font-mono); color: var(--text-muted); text-transform: uppercase; letter-spacing: .07em; padding: 36px 0 14px; }
.fi-migas a{ color: var(--accent); text-decoration: none; }
.fi-migas a:hover{ text-decoration: underline; }

.fi-entidad{ font: 13px var(--font-sans); color: var(--accent); margin: 0 0 8px; }
.fi-h1{ font: 600 27px/1.28 var(--font-sans); color: var(--text-primary); margin: 0 0 16px; }
.fi-chips{ display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.fi-chip{
  font: 10.5px var(--font-mono); text-transform: uppercase; letter-spacing: .06em;
  padding: 4px 9px; border: 1px solid var(--border); color: var(--text-muted);
}
.fi-chip--estado{ color: var(--accent); background: var(--accent-faint); border-color: var(--accent-soft); }
.fi-chip--tipo{ display: inline-flex; align-items: center; gap: 6px; color: var(--text-primary); font-weight: 600; border: 1.5px solid var(--tipo); }
.fi-chip-punto{ width: 8px; height: 8px; border-radius: 50%; background: var(--tipo); }
.fi-chip--otros{ border-style: dashed; }
.fi-chip--otros .fi-chip-punto{ background: transparent; border: 1.5px dashed var(--tipo); }

.fi-sec{ margin-top: 40px; }
.fi-h2{
  font: 600 16px var(--font-sans); color: var(--text-primary);
  margin: 0 0 14px; padding-bottom: 8px; border-bottom: 1px solid var(--border);
}
.fi-panel{ background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 10px; padding: 18px 20px; }

.fi-cifras{ display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 20px; }
.fi-cifra-v{ font: 600 21px var(--font-mono); color: var(--text-primary); }
.fi-cifra-l{ font: 10.5px var(--font-mono); color: var(--text-muted); text-transform: uppercase; letter-spacing: .06em; margin-top: 5px; }
.fi-cifra--falta .fi-cifra-v{ font-size: 14px; font-weight: 400; color: var(--text-muted); font-style: italic; }

/* Estado vacío honesto: dice qué falta y por qué, en vez de un hueco mudo o
   una cifra inventada. */
.fi-vacio{
  border: 1px dashed var(--border); border-radius: 10px; padding: 18px 20px;
  font: 13.5px/1.6 var(--font-sans); color: var(--text-muted);
}
.fi-vacio strong{ color: var(--text-primary); font-weight: 600; }

.fi-tabla{ width: 100%; border-collapse: collapse; }
.fi-tabla th{
  font: 10.5px var(--font-mono); color: var(--text-muted); text-transform: uppercase;
  letter-spacing: .06em; text-align: left; padding: 0 10px 8px 0; font-weight: 400;
}
.fi-tabla td{ font: 13.5px var(--font-sans); color: var(--text-primary); padding: 9px 10px 9px 0; border-top: 1px solid var(--border); }
.fi-tabla td.num{ font-family: var(--font-mono); text-align: right; width: 84px; }

/* Nivel 2: se ven las filas y qué miden, no los valores. El desenfoque va sobre
   una barra gris y NO sobre un número falso — no hay cifra debajo que leer. */
.fi-n2{ position: relative; }
.fi-n2-fila{ display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 11px 0; border-top: 1px solid var(--border); }
.fi-n2-fila:first-child{ border-top: none; }
.fi-n2-label{ font: 13.5px var(--font-sans); color: var(--text-primary); }
.fi-n2-oculto{ height: 12px; width: 108px; border-radius: 3px; background: var(--border); filter: blur(3px); flex-shrink: 0; }
.fi-n2-nota{ font: 12.5px/1.6 var(--font-sans); color: var(--text-muted); margin: 14px 0 0; }

/* §4 — el pliego procesado y su subida. Estados con --success y --warning, los
   tokens -700 que ya aguantan AA como texto (CLAUDE.md §3). */
.fi-pl-meta{ font: 12.5px/1.6 var(--font-sans); color: var(--text-muted); margin: 0 0 4px; }
.fi-pl-ok{ color: var(--success); }
.fi-pl-aviso{ color: var(--warning); }
.fi-pl-h3{ font: 600 14px var(--font-sans); color: var(--text-primary); margin: 20px 0 2px; }
.fi-pl-origen{ font: 11px var(--font-mono); color: var(--text-muted); margin: 0 0 8px; }
.fi-pl-dl{ margin: 0; }
.fi-pl-dl > div{ padding: 9px 0; border-top: 1px solid var(--border); }
.fi-pl-dl dt{ font: 10.5px var(--font-mono); color: var(--text-muted); text-transform: uppercase; letter-spacing: .06em; }
.fi-pl-dl dd{ font: 13.5px/1.55 var(--font-sans); color: var(--text-primary); margin: 4px 0 0; }
.fi-pl-falta{ font: italic 13px/1.55 var(--font-sans); color: var(--text-muted); }
.fi-pl-cifra{ font: 600 19px var(--font-mono); color: var(--text-primary); margin: 4px 0 0; }
.fi-pl-lista{ margin: 4px 0 0; padding-left: 18px; font: 13.5px/1.6 var(--font-sans); color: var(--text-primary); }
.fi-pl-lista li{ margin: 4px 0; }
.fi-pl-sev{ font: 10.5px var(--font-mono); text-transform: uppercase; color: var(--text-muted); }
.fi-pl-form{ display: grid; gap: 12px; margin-top: 14px; font: 13px var(--font-sans); color: var(--text-primary); }
.fi-pl-form label{ display: grid; gap: 6px; }
.fi-pl-form .fi-btn{ justify-self: start; cursor: pointer; }
.fi-pl-nota{ font: 12.5px/1.6 var(--font-sans); color: var(--text-muted); margin: 0; }
.fi-pl-reemplazo{ margin-top: 14px; font: 13px var(--font-sans); color: var(--text-muted); }
.fi-pl-reemplazo summary{ cursor: pointer; color: var(--accent); }
.fi-pl-resultado{ font: 600 13.5px var(--font-sans); margin: 0 0 12px; }

/* §7 — cada rival se despliega. La fila del <summary> repite la rejilla de la
   cabecera para que se lea como una tabla. */
.fi-rival-cab, .fi-rival summary{
  display: grid; grid-template-columns: 1fr 96px 80px; gap: 10px; align-items: baseline;
}
.fi-rival-cab{ font: 10.5px var(--font-mono); color: var(--text-muted); text-transform: uppercase; letter-spacing: .06em; padding: 0 0 8px 18px; }
.fi-rival-cab .num, .fi-rival summary .num{ text-align: right; font-family: var(--font-mono); }
.fi-rival-lista{ list-style: none; margin: 0; padding: 0; }
.fi-rival{ border-top: 1px solid var(--border); }
.fi-rival summary{ cursor: pointer; padding: 9px 0; font: 13.5px var(--font-sans); color: var(--text-primary); list-style: none; }
.fi-rival summary::-webkit-details-marker{ display: none; }
.fi-rival-nombre::before{ content: "▸"; display: inline-block; width: 18px; color: var(--accent); }
.fi-rival[open] .fi-rival-nombre::before{ content: "▾"; }
.fi-rival-cuerpo{ padding: 4px 0 16px 18px; }
.fi-rival-cifras{ margin: 6px 0 4px; }
.fi-rival-h{ font: 600 13px var(--font-sans); color: var(--text-primary); margin: 14px 0 2px; }

.fi-cierre{ display: flex; flex-wrap: wrap; gap: 12px; margin-top: 18px; }
.fi-btn{
  font: 500 13px var(--font-sans); text-decoration: none; padding: 10px 16px;
  border-radius: 6px; border: 1px solid var(--accent); color: var(--accent);
}
.fi-btn--primario{ background: var(--accent); color: #fff; }
.fi-btn:hover{ opacity: .9; }

/* Ficha para explorar: seis preguntas, una superficie de lectura. */
.fi-pagina{ padding: 20px 0 40px; }
.fi-interactiva{ max-width: 860px; padding-bottom: 48px; overflow-wrap: anywhere; }
.fi-interactiva *{ box-sizing: border-box; }
.fi-interactiva .fi-migas{ padding: 24px 0; text-transform: none; letter-spacing: 0; font: 13px var(--font-sans); }
.fi-cabecera{ padding: 8px 0 24px; }
.fi-interactiva .fi-chips{ align-items: center; gap: 12px; margin: 0 0 16px; }
.fi-interactiva .fi-chip{ font: 500 12px var(--font-sans); letter-spacing: 0; text-transform: none; border-radius: 30px; padding: 6px 10px; }
.fi-interactiva .fi-chip--tipo{ border-color: var(--border); }
.fi-identificador{ color: var(--text-muted); font: 12px var(--font-mono); }
.fi-interactiva .fi-h1{ font: 600 clamp(24px, 3.4vw, 35px)/1.22 var(--font-sans); letter-spacing: -.035em; max-width: 760px; margin-bottom: 16px; text-wrap: pretty; }
.fi-interactiva .fi-entidad{ color: var(--text-primary); font: 500 14px/1.5 var(--font-sans); margin: 0; }
.fi-lugar{ color: var(--text-muted); font: 13px/1.5 var(--font-sans); margin: 3px 0 0; }
.fi-estado{ display: flex; align-items: center; flex-wrap: wrap; gap: 7px; font: 500 13px/1.5 var(--font-sans); color: var(--text-primary); margin: 15px 0 0; }
.fi-estado-nota{ color: var(--text-muted); font-weight: 400; padding-left: 5px; }
.fi-identificacion{ font: 13px/1.6 var(--font-sans); color: var(--text-muted); margin-top: 8px; }
.fi-interactiva summary{ cursor: pointer; min-height: 44px; align-content: center; padding: 10px 0; }
.fi-interactiva summary:hover{ color: var(--accent); }
.fi-interactiva a:focus-visible, .fi-interactiva button:focus-visible, .fi-interactiva summary:focus-visible{ outline: 3px solid var(--accent); outline-offset: 4px; }
.fi-explorador{ border-top: 1px solid var(--border); padding-top: 19px; }
.fi-explorar-cabecera{ display: flex; justify-content: space-between; gap: 12px; align-items: baseline; margin: 0 0 12px; font: 500 14px var(--font-sans); color: var(--text-primary); }
.fi-explorar-cabecera p{ margin: 0; }
.fi-explorar-cabecera span{ color: var(--text-muted); font: 12px var(--font-sans); }
.fi-navegacion{ display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; margin-bottom: 18px; }
.fi-navegacion button{ display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; min-width: 0; min-height: 82px; padding: 12px 4px; background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 12px; color: var(--text-primary); font: 500 13px/1.3 var(--font-sans); cursor: pointer; transition: background .15s, border-color .15s; }
.fi-navegacion button:hover{ border-color: var(--accent); }
.fi-navegacion button[aria-pressed="true"]{ background: var(--text-primary); border-color: var(--text-primary); color: var(--surface-elevated); }
.fi-navegacion svg{ width: 21px; height: 21px; flex-shrink: 0; }
.fi-tab-panel{ background: var(--surface-elevated); border: 1px solid var(--border); border-radius: 16px; padding: 28px; scroll-margin-top: 100px; margin-bottom: 14px; }
.fi-tab-panel[hidden]{ display: none; }
.fi-sobretitulo{ font: 500 12px/1.5 var(--font-sans); color: var(--text-muted); margin: 0 0 8px; }
.fi-titulo-panel{ font: 600 23px/1.25 var(--font-sans); color: var(--text-primary); letter-spacing: -.025em; margin: 0 0 18px; }
.fi-presupuesto{ font: 600 clamp(24px, 4.5vw, 40px)/1.2 var(--font-sans); font-variant-numeric: tabular-nums; letter-spacing: -.035em; color: var(--text-primary); margin: 0 0 7px; }
.fi-presupuesto--falta{ font-size: 23px; }
.fi-presupuesto-nota{ font: 12px/1.5 var(--font-sans); color: var(--text-muted); margin: 0 0 18px; }
.fi-datos{ margin: 0; }
.fi-dato{ display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr); gap: 16px; align-items: baseline; padding: 13px 0; border-bottom: 1px solid var(--border); font: 14px/1.5 var(--font-sans); }
.fi-dato:last-child{ border-bottom: 0; }
.fi-dato dt{ color: var(--text-muted); }
.fi-dato dd{ color: var(--text-primary); text-align: right; font-weight: 500; margin: 0; }
.fi-texto{ font: 15px/1.65 var(--font-sans); color: var(--text-primary); margin: 0; }
.fi-nota{ padding: 16px; border-radius: 10px; background: var(--bg); margin-top: 20px; font: 13px/1.6 var(--font-sans); color: var(--text-muted); }
.fi-nota strong{ color: var(--text-primary); font-weight: 600; }
.fi-nota p{ margin: 5px 0 0; }
.fi-fuente{ border-top: 1px solid var(--border); margin-top: 22px; padding-top: 6px; font: 13px/1.6 var(--font-sans); color: var(--text-muted); }
.fi-fuente summary{ color: var(--accent); font-weight: 500; }
.fi-fuente p{ margin: 4px 0 10px; }
.fi-fuente a{ color: var(--accent); display: inline-block; padding: 10px 0; min-height: 44px; }
.fi-ayuda{ color: var(--text-muted); font: 13px/1.6 var(--font-sans); margin: 16px 0 0; }
.fi-desplegable{ margin-top: 16px; font: 14px/1.6 var(--font-sans); color: var(--text-primary); }
.fi-desplegable>summary{ font-weight: 500; }
.fi-pendiente{ display: flex; align-items: flex-start; gap: 14px; padding: 18px 0; font: 14px/1.6 var(--font-sans); }
.fi-pendiente>span{ display: grid; place-items: center; flex-shrink: 0; width: 32px; height: 32px; border: 1px dashed var(--text-muted); border-radius: 50%; font: 500 18px var(--font-sans); color: var(--text-muted); }
.fi-pendiente strong{ color: var(--text-primary); font-weight: 600; }
.fi-pendiente p{ color: var(--text-muted); margin: 6px 0 0; }
.fi-participar{ display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 8px 0 18px; font: 13px/1.5 var(--font-sans); color: var(--text-muted); }
.fi-interactiva .fi-btn{ display: inline-flex; justify-content: center; align-items: center; gap: 14px; min-height: 44px; cursor: pointer; background: var(--surface-elevated); line-height: 1.5; text-align: center; }
.fi-interactiva .fi-btn--primario{ background: var(--accent); color: var(--surface-elevated); }
.fi-participar button[aria-pressed="true"]{ background: var(--text-primary); color: var(--surface-elevated); border-color: var(--text-primary); }
.fi-pie-ficha{ border-top: 1px solid var(--border); padding: 22px 0 0; text-align: center; color: var(--text-muted); font: 12px/1.5 var(--font-sans); }
.fi-pie-ficha p{ margin: 0 0 8px; }
.fi-pie-ficha a{ display: inline-block; color: var(--accent); padding: 10px 0; min-height: 44px; font-size: 13px; }
.fi-interactiva #pliego{ scroll-margin-top: 100px; }
.fi-interactiva .fi-pl-form input{ max-width: 100%; min-width: 0; }
.fi-interactiva .fi-pl-dl dd{ overflow-wrap: anywhere; }
@media (max-width: 600px){
  .fi-interactiva{ padding: 0 16px 32px; }
  .fi-interactiva .fi-migas{ padding: 18px 0; }
  .fi-cabecera{ padding-top: 0; padding-bottom: 16px; }
  .fi-interactiva .fi-h1{ font-size: 24px; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
  .fi-explorar-cabecera span{ display: none; }
  .fi-navegacion{ grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .fi-navegacion button{ min-height: 74px; font-size: 12px; }
  .fi-tab-panel{ padding: 20px 17px; border-radius: 14px; }
  .fi-titulo-panel{ font-size: 21px; }
  .fi-dato{ font-size: 13px; gap: 12px; }
  .fi-participar{ flex-direction: column; align-items: stretch; gap: 10px; padding-top: 4px; text-align: center; }
  .fi-interactiva .sf--bloque .sf-item{ flex-wrap: wrap; }
  .fi-interactiva .sf--bloque .sf-explicacion{ flex-basis: 100%; }
  .fi-interactiva .fi-pl-form label{ font-size: 14px; }
  .fi-interactiva .fi-rival-cab, .fi-interactiva .fi-rival summary{ grid-template-columns: minmax(0, 1fr) 50px 50px; }
}
@media (prefers-reduced-motion: reduce){ .fi-navegacion button{ transition: none; } }
@media print{
  .fi-tab-panel[hidden]{ display: block; }
  .fi-navegacion, .fi-participar, .fi-pl-form{ display: none; }
}
`;
