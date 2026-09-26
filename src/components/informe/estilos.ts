/**
 * Estilos del informe mensual. Tokens de globals.css (los mide
 * contraste.test.ts). La parte de impresión deja el informe solo: sin barra,
 * sin pie, sin botón, en blanco y con las tablas sin partir.
 */
export const ESTILOS_INFORME = `
.inf{ max-width: 920px; margin: 0 auto; color: var(--text-primary); }
.inf-eyebrow{ margin: 0 0 10px; font: 600 11px var(--font-jetbrains-mono), monospace; letter-spacing: .12em; color: var(--accent); }
.inf h1{ margin: 0; font: 700 clamp(1.9rem, 4vw, 2.6rem)/1.1 var(--font-inter), sans-serif; letter-spacing: -.02em; }
.inf-sub{ margin: 10px 0 0; font: 16px/1.5 var(--font-inter), sans-serif; color: var(--text-muted); }
.inf-acciones{ display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; margin: 20px 0 0; }
.inf-imprimir{
  min-height: 44px; padding: 0 20px; border: 0; border-radius: 8px; cursor: pointer;
  background: var(--accent-fill); color: #fff; font: 600 14px var(--font-inter), sans-serif;
}
.inf-imprimir:hover{ background: var(--accent-fill-hover); }
.inf-imprimir:focus-visible{ outline: 2px solid var(--accent); outline-offset: 3px; }
.inf-generado{ font: 12.5px var(--font-inter), sans-serif; color: var(--text-muted); }
.inf-cifras{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 32px 0 0; }
.inf-cifra{ padding: 16px 18px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); }
.inf-cifra strong{ display: block; font: 700 26px/1.15 var(--font-inter), sans-serif; }
.inf-cifra span{ display: block; margin-top: 4px; font: 13px/1.4 var(--font-inter), sans-serif; color: var(--text-muted); }
.inf h2{ margin: 40px 0 12px; font: 700 20px var(--font-inter), sans-serif; }
.inf table{ width: 100%; border-collapse: collapse; font: 14.5px/1.4 var(--font-inter), sans-serif; }
.inf th, .inf td{ padding: 9px 10px; border-bottom: 1px solid var(--border); text-align: left; }
.inf thead th{ font: 600 12.5px var(--font-inter), sans-serif; color: var(--text-muted); }
.inf td.num, .inf th.num{ text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.inf-tipo{ display: inline-flex; align-items: center; gap: 8px; }
.inf-tipo i{ width: 9px; height: 9px; border-radius: 50%; background: var(--tipo); }
.inf-tipo--otros i{ background: transparent; border: 1.5px dashed var(--tipo); }
.inf-nota{ margin: 8px 0 0; font: 12.5px/1.5 var(--font-inter), sans-serif; color: var(--text-muted); }
.inf-metodo{ margin: 40px 0 0; padding: 16px 20px; border: 1px dashed var(--border); border-radius: 10px; }
.inf-metodo h2{ margin: 0 0 8px; font-size: 15px; }
.inf-metodo ul{ margin: 0; padding-left: 18px; font: 13.5px/1.6 var(--font-inter), sans-serif; color: var(--text-muted); }
.inf-vacio{ margin: 32px 0; color: var(--text-muted); }
@media (max-width: 640px){ .inf-cifras{ grid-template-columns: 1fr; } }
@media print{
  .clr-nav, .clr-mobile-menu, .saltar-contenido, footer, .no-imprimir{ display: none !important; }
  body, .clr-page{ background: #fff !important; padding: 0 !important; min-height: 0 !important; }
  .inf{ max-width: none; padding: 0; color: #000; }
  .inf-cifra{ border-color: #999; }
  .inf table, .inf tr, .inf-cifras, .inf-metodo{ break-inside: avoid; }
  .inf h2{ break-after: avoid; }
}
`;
