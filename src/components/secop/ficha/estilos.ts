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

/* Nota al pie de una tabla o un panel. */
.fi-n2-nota{ font: 12.5px/1.6 var(--font-sans); color: var(--text-muted); margin: 14px 0 0; }

/* §4 — el pliego procesado y su subida. Estados con --success y --warning, los
   tokens -700 que ya aguantan AA como texto (CLAUDE.md §3). */
/* Sin pliego: lo que se desbloquea al subirlo (paso 3 del plan del bloque de decisión). */
.fi-desbloquea{ border: 1px dashed var(--border); border-radius: 10px; padding: 16px 20px; font: 13.5px/1.6 var(--font-sans); color: var(--text-muted); }
.fi-desbloquea strong{ color: var(--text-primary); font-weight: 600; }
.fi-desbloquea-titulo{ margin: 0 0 6px; }
.fi-desbloquea-lista{ margin: 0 0 10px; padding-left: 20px; }
.fi-desbloquea-lista li{ margin: 4px 0; }
.fi-desbloquea-nota{ margin: 0; }
.fi-tabla th.num, .fi-tabla td.num{ text-align: right; }
.fi-tabla .fi-tabla-total{ width: 160px; }

/* Detalle del proceso, plegado. El resumen lleva el estilo del h2. */
.fi-detalle > summary{ cursor: pointer; list-style: revert; }
.fi-detalle[open] > summary{ margin-bottom: 6px; }
.fi-detalle .fi-pl-dl > div:first-child{ border-top: 0; }

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

.fi-entidad-lugar{ color: var(--text-muted); }
.fi-expediente{ display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 6px 0 24px; }

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
.fi-def{ display: block; color: var(--text-muted); font: 12.5px/1.5 var(--font-sans); margin-top: 2px; }
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
/* Ficha operativa: tema local, superficies sobrias y lectura continua. */
.fi-pagina{padding:0 0 48px}.fi-interactiva{max-width:1280px;padding:0 28px 48px;font:14px/1.6 var(--font-sans);overflow-wrap:anywhere}
.fi-interactiva .fi-migas{padding:24px 0}.fi-interactiva .fi-h1{max-width:none;font-size:clamp(28px,3.3vw,46px);line-height:1.17;display:block;overflow:visible;letter-spacing:-.035em;text-wrap:balance}
.fi-cabecera{position:relative;isolation:isolate;overflow:hidden;border:1px solid var(--border);border-radius:24px;padding:48px 32px 30px;min-height:590px}
.fi-cabecera::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,20,35,.96),rgba(6,20,35,.65)),linear-gradient(0deg,var(--bg),transparent 65%);z-index:-1;pointer-events:none}
.fi-hero-imagen{object-fit:cover;z-index:-2}.fi-hero-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:38px;align-items:start}.fi-hero-texto{padding-top:16px}.fi-interactiva .fi-entidad{font-size:16px}.fi-cabecera .fi-identificacion{max-width:600px}.fi-cabecera .fi-estado{margin:24px 0 16px;color:var(--accent);font-weight:700}.fi-estado-nota{flex-basis:100%;padding:0;font-size:13px}
.fi-imagen-abrir{position:absolute;top:12px;left:20px;border:0;background:transparent;color:var(--text-muted);font:12px var(--font-sans);min-height:32px;cursor:pointer}.fi-imagen-dialogo{max-width:min(1100px,95vw);padding:0;border:1px solid var(--border);border-radius:16px;background:var(--surface);color:var(--text-primary)}.fi-imagen-dialogo::backdrop{background:rgba(0,0,0,.8)}.fi-imagen-dialogo img{width:100%;height:auto;display:block;max-height:75vh;object-fit:contain}.fi-imagen-dialogo>div{padding:16px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px}.fi-imagen-dialogo p{margin:0;font-size:12px}
.fi-guia{background:rgba(12,32,52,.96);border:1px solid var(--line-strong);border-radius:18px;padding:24px;box-shadow:0 20px 55px rgba(0,0,0,.15)}.fi-guia-top{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:var(--text-muted);border-bottom:1px solid var(--border);padding-bottom:14px;margin-bottom:20px}.fi-guia-top strong{color:var(--accent);text-align:right}.fi-guia-kicker{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin:0 0 6px;display:block}.fi-guia h2{font-size:23px;letter-spacing:-.02em;line-height:1.25;margin:0 0 8px}.fi-guia-intro{font-size:12px;color:var(--text-muted);margin:0 0 20px}
.fi-guia-etapas{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));margin:20px -10px 0;position:relative}.fi-guia-etapas::before{content:"";position:absolute;top:13px;left:10%;right:10%;height:2px;background:var(--line-strong)}.fi-guia-etapas button{position:relative;background:transparent;color:var(--text-muted);border:0;padding:0 3px;cursor:pointer;display:flex;flex-direction:column;align-items:center;font:10px/1.4 var(--font-sans);min-height:72px}.fi-guia-dot{width:27px;height:27px;border-radius:50%;background:var(--surface);border:2px solid var(--line-strong);display:grid;place-items:center;font-size:11px;margin-bottom:8px}.fi-guia-etapas .actual{color:var(--accent);font-weight:700}.fi-guia-etapas .actual .fi-guia-dot{background:var(--accent);border-color:var(--accent);box-shadow:0 0 0 5px var(--accent-soft)}.fi-guia-etapas .completa .fi-guia-dot{border-color:var(--accent);color:var(--accent)}.fi-guia-etapas [aria-pressed="true"] .fi-guia-dot{outline:1px solid var(--text-primary);outline-offset:3px}.fi-guia-etapas small{font-size:9px;margin-top:3px}.fi-guia-nota{font-size:11px;min-height:64px;color:var(--text-muted);background:var(--accent-faint);padding:12px;border-radius:8px}.fi-guia-nota strong{color:var(--text-primary)}
.fi-guia-reloj{border-top:1px solid var(--border);padding-top:16px}.fi-guia-dias{display:flex;align-items:baseline;gap:12px}.fi-guia-dias strong{font:700 68px/1.1 var(--font-sans);letter-spacing:-.04em;color:var(--accent);font-variant-numeric:tabular-nums}.fi-guia-dias span{font-size:15px}.fi-guia-reloj p{font-size:11px;color:var(--text-muted);margin:6px 0}.fi-guia-fecha strong{display:block;color:var(--text-primary);font-size:14px}.fi-guia-fecha span{font-size:10px}.fi-guia-barra{height:4px;background:var(--border);border-radius:2px;margin-top:14px;overflow:hidden}.fi-guia-barra span{display:block;height:100%;background:var(--accent);border-radius:2px}.fi-guia-extremos{display:flex;justify-content:space-between;font-size:9px;color:var(--text-muted);margin-top:6px}.fi-guia-accion{display:flex;align-items:center;justify-content:space-between;text-decoration:none;color:var(--bg);background:var(--accent);padding:12px 15px;border-radius:9px;font-weight:600;min-height:44px;margin-top:18px}.fi-guia-enlace{display:block;text-align:center;color:var(--accent);font-size:12px;padding:12px 0;text-decoration:none}.fi-guia-pie{font-size:10px;color:var(--text-muted);margin:0}
.fi-kpis{display:grid;grid-template-columns:1.15fr 1fr 1fr;gap:0;border:1px solid var(--border);border-radius:16px;background:var(--surface);margin:18px 0 28px;scroll-margin-top:90px}.fi-kpis>div{padding:22px 26px;min-width:0}.fi-kpis>div+div{border-left:1px solid var(--border)}.fi-kpis span{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);display:block;margin-bottom:9px}.fi-kpis strong{font-size:20px;line-height:1.3;font-variant-numeric:tabular-nums;display:block}.fi-kpis small{font-size:11px;color:var(--text-muted)}
.fi-explorador{padding:0;border:0}.fi-herramientas{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:14px}.fi-modos{display:flex;padding:4px;border:1px solid var(--border);border-radius:10px;background:var(--surface)}.fi-modos button{min-height:40px;padding:7px 14px;background:transparent;border:0;border-radius:7px;color:var(--text-muted);font:13px var(--font-sans);cursor:pointer}.fi-modos [aria-pressed="true"]{background:var(--surface-alt);color:var(--text-primary)}.fi-acciones{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.fi-acciones a{color:var(--accent);font-size:12px}.fi-interactiva .fi-btn{font-size:12px;padding:8px 12px;border-color:var(--line-strong);border-radius:8px;gap:8px}.fi-atajos{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 24px}.fi-atajos a{color:var(--accent);border:1px solid var(--border);padding:8px 12px;border-radius:30px;font-size:11px;min-height:36px;text-decoration:none}.fi-aviso{color:var(--accent);font-size:12px}.fi-aviso:empty{display:none}
.fi-layout{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:28px}.fi-contenido{display:grid;gap:16px;align-content:start}.fi-card,.fi-detalle{border:1px solid var(--border);background:var(--surface);border-radius:14px;scroll-margin-top:90px;min-width:0}.fi-card{padding:28px}.fi-card>h2,.fi-detalle>summary h2{font:600 20px/1.3 var(--font-sans);letter-spacing:-.02em;margin:0;color:var(--text-primary)}.fi-card>h2{margin-bottom:18px}.fi-detalle>summary{padding:22px 28px;display:flex;justify-content:space-between;gap:14px;list-style:none}.fi-detalle>summary::-webkit-details-marker{display:none}.fi-detalle>summary>span{color:var(--accent);font-size:24px;line-height:1}.fi-detalle[open]>summary>span{transform:rotate(45deg)}.fi-detalle-cuerpo{padding:0 28px 28px}.fi-detalle[open]>summary{margin:0}.fi-indice{align-self:start;position:sticky;top:88px;font-size:12px}.fi-indice nav{border-left:1px solid var(--border);padding-left:16px}.fi-indice nav>p{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin:0 0 8px}.fi-indice nav>a{display:block;color:var(--text-muted);text-decoration:none;padding:8px 0;line-height:1.5}.fi-indice nav>a[aria-current]{color:var(--accent);font-weight:600}.fi-indice>button{margin:20px 0 10px;width:100%}.fi-volver{display:block;text-align:center;color:var(--text-muted);padding:10px}.fi-rapida .fi-detalle{display:none}.fi-rapida #ficha-general,.fi-rapida #ficha-metas{display:none}
.fi-requisitos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:20px 0}.fi-requisitos>div{padding:18px;border:1px solid var(--border);border-radius:10px;background:var(--accent-faint)}.fi-requisitos span{color:var(--accent);font:12px var(--font-mono)}.fi-requisitos h3{font-size:14px;margin:8px 0}.fi-requisitos p{font-size:12px;line-height:1.65;color:var(--text-muted);margin:0}.fi-cambios{list-style:none;padding:0;margin:0}.fi-cambios li{border-left:2px solid var(--line-strong);padding:0 0 22px 20px;position:relative}.fi-cambios li::before{content:"";width:8px;height:8px;background:var(--accent);border-radius:50%;position:absolute;left:-5px;top:6px}.fi-cambios time{font-size:10px;color:var(--text-muted)}.fi-cambios h3{font-size:14px;margin:6px 0}.fi-cambios p{font-size:12px;color:var(--text-muted);margin:4px 0}.fi-interactiva .fi-sec{margin-top:24px}.fi-titulo-panel{font-size:16px}.fi-pie-ficha{margin-top:28px}
@media(max-width:1000px){.fi-hero-grid{grid-template-columns:1fr 1fr;gap:22px}.fi-cabecera{padding:40px 22px 22px}.fi-layout{grid-template-columns:minmax(0,1fr) 170px;gap:18px}.fi-guia{padding:18px}.fi-kpis>div{padding:20px}.fi-kpis strong{font-size:17px}}
@media(max-width:760px){.fi-interactiva{padding:0 16px 32px}.fi-cabecera{padding:42px 20px 20px;border-radius:18px}.fi-hero-grid{grid-template-columns:1fr;gap:24px}.fi-hero-texto{padding:0}.fi-interactiva .fi-h1{font-size:29px;display:block;-webkit-line-clamp:unset;overflow:visible}.fi-layout{display:block}.fi-indice{position:static;margin-top:24px}.fi-indice nav{display:none}.fi-indice>button{max-width:240px}.fi-kpis{grid-template-columns:1fr 1fr}.fi-kpis>div:first-child{grid-column:1/-1;border-bottom:1px solid var(--border)}.fi-kpis>div:nth-child(2){border-left:0}.fi-kpis>div{padding:17px}.fi-kpis strong{font-size:16px}.fi-herramientas{align-items:stretch}.fi-acciones{gap:8px;width:100%}.fi-card{padding:22px 18px;margin-bottom:16px}.fi-detalle{margin-bottom:12px}.fi-detalle>summary{padding:20px 18px}.fi-detalle-cuerpo{padding:0 18px 22px}.fi-card>h2,.fi-detalle>summary h2{font-size:18px}.fi-requisitos{grid-template-columns:1fr}.fi-dato{grid-template-columns:1fr;gap:3px}.fi-dato dd{text-align:left}.fi-imagen-dialogo>div{flex-direction:column;align-items:stretch}.fi-interactiva .fi-rival-cab,.fi-interactiva .fi-rival summary{grid-template-columns:minmax(0,1fr) 50px 50px}.fi-guia-etapas small{font-size:8px}.fi-cabecera::after{background:linear-gradient(0deg,var(--bg),rgba(6,20,35,.86))}}
@media(prefers-reduced-motion:reduce){.fi-interactiva *{scroll-behavior:auto!important;transition:none!important}}
@media print{.fi-pagina{background:white!important;color:black!important}.fi-interactiva{max-width:none;padding:0;--bg:white;--surface:white;--surface-alt:white;--surface-elevated:white;--text-primary:black;--text-muted:#444;--border:#bbb;--accent:#075985;--line-strong:#bbb;color:black}.fi-cabecera{min-height:0;padding:12px;border:0}.fi-cabecera::after,.fi-hero-imagen,.fi-guia,.fi-imagen-abrir,.fi-herramientas,.fi-atajos,.fi-indice,.fi-pl-form,.fi-pl-reemplazo{display:none!important}.fi-hero-grid,.fi-layout{display:block}.fi-detalle,.fi-rapida .fi-detalle{display:block!important;break-inside:avoid}.fi-interactiva details>div,.fi-interactiva details>dl,.fi-interactiva details>p,.fi-interactiva details>section{display:block!important}.fi-card,.fi-detalle{margin-bottom:12px}.fi-kpis strong{font-size:15px}.fi-card>h2,.fi-detalle>summary h2{color:black}.fi-pie-ficha{color:#444}}

.fi-documentos{margin-bottom:24px}.fi-documentos label{font-size:12px;display:block;margin:16px 0 6px}.fi-documentos-buscar{display:flex;gap:8px}.fi-documentos input{min-width:0;flex:1;background:var(--bg);color:var(--text-primary);border:1px solid var(--border);border-radius:8px;padding:10px;font:13px var(--font-sans)}.fi-documentos-lista{list-style:none;padding:0}.fi-documentos-lista li{display:flex;justify-content:space-between;gap:16px;align-items:center;border:1px solid var(--border);border-radius:10px;padding:16px}.fi-documentos-lista strong{font-size:13px}.fi-documentos-lista p,.fi-documentos-lista small{font-size:11px;color:var(--text-muted);margin:4px 0}.fi-documentos nav{display:flex;align-items:center;gap:14px}.fi-acciones>div{display:flex;align-items:center;gap:10px}.fi-interactiva button:disabled{opacity:.5;cursor:default}
@media(max-width:600px){.fi-documentos-lista li{flex-direction:column;align-items:stretch}}
@media print{.fi-documentos-buscar,.fi-documentos label{display:none}}
`;
