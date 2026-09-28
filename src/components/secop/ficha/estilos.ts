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

.fi-entidad-lugar{ color: var(--text-muted); }
.fi-expediente{ display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 6px 0 24px; }

/* ── Bloque de decisión (spec 2026-09-28-ficha-bloque-decision) ─────────────
   Banda en --accent-ocean con texto blanco, secundario en --on-ocean-muted y
   acentos en --accent-river (contraste.test.ts los mide). El cuerpo, claro. */
.fd-id{ display: inline-flex; align-items: center; gap: 8px; }
.fd-id-num{ font: 12.5px var(--font-mono); color: var(--text-muted); }
.fd-copiar{
  font: 500 12.5px var(--font-sans); min-height: 36px; padding: 0 12px; cursor: pointer;
  border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text-primary);
}

.fd{
  background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
  box-shadow: 0 1px 2px rgba(10,31,28,.05), 0 18px 40px -16px rgba(12,74,110,.28);
  overflow: clip;
}
.fd-banda{
  background: var(--accent-ocean); color: #fff; padding: 22px 26px 24px;
  display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 32px;
}
.fd-veredicto{ display: flex; flex-direction: column; gap: 8px; }
.fd-pasos{ list-style: none; margin: 0 0 8px; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 18px; font: 12.5px var(--font-sans); color: var(--on-ocean-muted); }
.fd-paso{ display: inline-flex; align-items: center; gap: 7px; }
.fd-paso-marca{
  display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px;
  border-radius: 50%; border: 1px solid var(--on-ocean-muted); font: 700 11px var(--font-sans); box-sizing: border-box;
}
.fd-paso.is-hecho .fd-paso-marca{ background: var(--accent-river); border-color: var(--accent-river); color: var(--accent-ocean); }
.fd-paso.is-actual{ color: #fff; font-weight: 600; }
.fd-paso.is-actual .fd-paso-marca{ background: #fff; border-color: #fff; color: var(--accent-ocean); }
.fd-antetitulo{ font: 600 11px var(--font-sans); letter-spacing: .08em; text-transform: uppercase; color: var(--accent-river); margin: 0; }
.fd-antetitulo--claro{ color: var(--accent); }
.fd-titulo{ font: 700 24px/1.22 var(--font-sans); letter-spacing: -.01em; margin: 0; color: #fff; }
.fd-bajada{ font: 14.5px/1.55 var(--font-sans); color: var(--on-ocean-muted); margin: 0; max-width: 560px; }

.fd-datos{ margin: 0; display: flex; flex-direction: column; gap: 14px; padding-left: 26px; border-left: 1px solid rgba(255,255,255,.18); }
.fd-datos dt{ font: 600 11px var(--font-sans); letter-spacing: .08em; text-transform: uppercase; color: var(--accent-river); }
.fd-datos dd{ margin: 2px 0 0; }
.fd-cifra{ font: 700 24px var(--font-sans); letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
.fd-cifra--falta{ font-size: 16px; font-weight: 600; }
.fd-fecha{ font: 700 19px var(--font-sans); font-variant-numeric: tabular-nums; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
.fd-restan{ font: 600 13.5px var(--font-sans); }
.fd-barra{ height: 6px; border-radius: 3px; background: rgba(255,255,255,.2); margin-top: 6px !important; overflow: hidden; }
.fd-barra > span{ display: block; height: 100%; border-radius: 3px; background: var(--accent-river); }
.fd-modalidad{ font: 600 15px var(--font-sans); }
.fd-nota{ font: 12.5px/1.5 var(--font-sans); color: var(--on-ocean-muted); }
.fd-nota--sola{ font-size: 13px; }
.fd-que-es summary{ cursor: pointer; color: var(--accent-river); min-height: 28px; display: list-item; }
.fd-que-es p{ margin: 4px 0 0; }

.fd-cuerpo{ padding: 22px 26px 6px; }
.fd-cabeza-canal{ display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px 16px; margin-bottom: 12px; }
.fd-h3{ font: 700 15px var(--font-sans); color: var(--text-primary); margin: 0; }
.fd-resumen{ font: 13px var(--font-sans); color: var(--text-muted); }

/* El canal: cinco tramos pegados para que el agua se lea continua. */
.fd-canal{ list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); }
.fd-compuerta{ display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; min-width: 0; }
.fd-tramo{ position: relative; width: 100%; height: 72px; border-bottom: 2px solid var(--line); }
.fd-agua{ position: absolute; left: 0; right: 0; bottom: 0; height: 26px; }
.fd-agua--fluye{ background: rgba(125,211,252,.55); border-top: 2px solid var(--accent-river); }
.fd-agua--tope{ right: 50%; background: rgba(125,211,252,.55); border-top: 2px solid var(--accent-river); }
.fd-agua--tenue{ background: rgba(125,211,252,.22); border-top: 2px dashed var(--accent-river); }
.fd-svg{ position: absolute; left: 50%; top: 0; width: 60px; height: 72px; margin-left: -30px; }
.fd-poste{ fill: var(--text-primary); }
.fd-hoja{ stroke-width: 1.5; }
.fd-hoja--pass{ fill: var(--success); stroke: var(--success); }
.fd-hoja--warn{ fill: var(--warning); stroke: var(--warning); }
.fd-hoja--fail{ fill: var(--danger); stroke: var(--danger); }
.fd-hoja--unknown{ fill: var(--surface); stroke: var(--ink-600); stroke-dasharray: 4 3; }
.fd-hoja--dato{ fill: var(--surface-alt); stroke: var(--ink-300); }
.fd-etiqueta{ font: 700 13.5px var(--font-sans); color: var(--text-primary); margin-top: 4px; }
.fd-valor{ font: 12.5px var(--font-sans); color: var(--text-muted); }
.fd-palabra{ font: 600 12px var(--font-sans); padding: 2px 9px; border-radius: 999px; white-space: nowrap; }
.fd-palabra--pass{ color: var(--success); background: rgba(21,128,61,.06); }
.fd-palabra--warn{ color: var(--warning); background: rgba(180,83,9,.06); }
.fd-palabra--fail{ color: var(--danger); background: rgba(185,28,28,.06); }
.fd-palabra--unknown{ color: var(--ink-600); background: var(--surface-alt); }

.fd-porque, .fd-primera-vez{ margin-top: 16px; font: 14px/1.55 var(--font-sans); color: var(--text-primary); }
.fd-porque summary, .fd-primera-vez summary{ cursor: pointer; color: var(--accent); font-weight: 500; min-height: 32px; display: list-item; }
.fd-porque dl{ margin: 6px 0 0; }
.fd-porque dl > div{ display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 14px; padding: 9px 0; border-top: 1px solid var(--line-soft); }
.fd-porque dt{ font: 600 13px var(--font-sans); }
.fd-porque dd{ margin: 0; font: 13px/1.5 var(--font-sans); color: var(--text-muted); }
.fd-primera-vez p{ margin: 8px 0 0; padding: 12px 14px; background: var(--surface-alt); border-radius: 10px; }
.fd-primera-vez p + p{ margin-top: 0; border-radius: 0 0 10px 10px; padding-top: 0; }
.fd-nota-cuerpo{ font: 12.5px/1.5 var(--font-sans); color: var(--text-muted); }

.fd-wizard{ padding: 8px 26px 18px; outline: none; }
.fd-ayuda-movil{ display: none; }

.fd-accion{
  margin-top: 18px; padding: 16px 26px; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px;
  background: var(--accent-faint); border-top: 1px solid var(--border);
}
.fd-accion-texto{ flex: 1 1 280px; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.fd-ayuda{ font: 13.5px/1.45 var(--font-sans); color: var(--text-muted); }
.fd-accion-botones{ display: flex; flex-wrap: wrap; align-items: center; gap: 10px 18px; }
.fd-secundario{ font: 500 14px var(--font-sans); color: var(--accent); background: none; border: 0; padding: 0; cursor: pointer; }
.fd-cta{
  display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 20px;
  border-radius: 10px; border: 0; background: var(--accent); color: #fff; cursor: pointer;
  font: 600 15px var(--font-sans); text-decoration: none; text-align: center;
}
.fd-cta:hover{ background: var(--accent-ocean); }

@media (max-width: 760px){
  .fd-banda{ grid-template-columns: minmax(0, 1fr); gap: 18px; padding: 18px; }
  .fd-datos{ padding: 14px 0 0; border-left: 0; border-top: 1px solid rgba(255,255,255,.18); display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
  /* El presupuesto no cabe en media columna: ocupa la fila y debajo van las otras dos. */
  .fd-datos > div:first-child{ grid-column: 1 / -1; }
  .fd-cifra{ font-size: 21px; }
  .fd-titulo{ font-size: 21px; }
  .fd-cuerpo{ padding: 18px 12px 4px; }
  .fd-porque, .fd-primera-vez{ padding: 0 6px; }
  .fd-porque dl > div{ grid-template-columns: minmax(0, 1fr); gap: 2px; }
  .fd-svg{ width: 44px; height: 54px; margin-left: -22px; }
  .fd-tramo{ height: 54px; }
  .fd-agua{ height: 20px; }
  .fd-etiqueta{ font-size: 12px; hyphens: auto; }
  .fd-palabra{ font-size: 11px; padding: 2px 6px; }
  .fd-wizard{ padding: 8px 12px 16px; }
  /* El siguiente paso se queda en la zona del pulgar mientras se lee el bloque. */
  .fd-accion{
    position: sticky; bottom: 0; z-index: 5; padding: 10px 12px 12px; margin-top: 12px;
    background: var(--surface); box-shadow: 0 -8px 24px rgba(10,31,28,.08);
  }
  .fd-accion-texto{ display: none; }
  .fd-ayuda-movil{ display: block; margin: 14px 6px 0; font: 13px/1.5 var(--font-sans); color: var(--text-muted); }
  .fd-ayuda-movil strong{ color: var(--text-primary); font-weight: 600; }
  .fd-accion-botones{ width: 100%; flex-wrap: nowrap; gap: 12px; }
  .fd-cta{ flex: 1 1 auto; min-width: 0; padding: 0 14px; }
  .fd-secundario{ flex: 0 1 38%; text-align: center; font-size: 13px; line-height: 1.3; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; }
}

.fi-cierre{ display: flex; flex-wrap: wrap; gap: 12px; margin-top: 18px; }
.fi-btn{
  font: 500 13px var(--font-sans); text-decoration: none; padding: 10px 16px;
  border-radius: 6px; border: 1px solid var(--accent); color: var(--accent);
}
.fi-btn--primario{ background: var(--accent); color: #fff; }
.fi-btn:hover{ opacity: .9; }
`;
