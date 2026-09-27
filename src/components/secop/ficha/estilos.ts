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

.fi-cierre{ display: flex; flex-wrap: wrap; gap: 12px; margin-top: 18px; }
.fi-btn{
  font: 500 13px var(--font-sans); text-decoration: none; padding: 10px 16px;
  border-radius: 6px; border: 1px solid var(--accent); color: var(--accent);
}
.fi-btn--primario{ background: var(--accent); color: #fff; }
.fi-btn:hover{ opacity: .9; }
`;
