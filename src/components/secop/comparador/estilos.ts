/**
 * Estilos del comparador. Viven aquí y no en Comparador.jsx porque aquel es un
 * módulo de cliente: lo que una página de servidor importa de él es una
 * referencia, no el texto, y la hoja llegaba vacía.
 *
 * Tokens de globals.css: los mide contraste.test.ts.
 */
export const ESTILOS_COMPARADOR = `
.cmp-selectores{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 0 0 24px; }
.cmp-selector{ display: flex; flex-direction: column; gap: 6px; font: 600 12.5px var(--font-inter), sans-serif; color: var(--text-muted); }
.cmp-selector select{
  min-height: 44px; padding: 0 12px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--surface); color: var(--text-primary); font: 15px var(--font-inter), sans-serif;
}
.cmp-selector select:focus-visible{ outline: 2px solid var(--accent); outline-offset: 2px; }
.cmp-tabla{ overflow-x: auto; }
.cmp-tabla:focus-visible{ outline: 2px solid var(--accent); outline-offset: 4px; }
.cmp table{ width: 100%; border-collapse: collapse; font: 15px/1.4 var(--font-inter), sans-serif; color: var(--text-primary); }
.cmp th, .cmp td{ padding: 12px 14px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
.cmp thead th{ font: 700 17px var(--font-inter), sans-serif; }
.cmp tbody th{ width: 30%; font: 500 13.5px/1.4 var(--font-inter), sans-serif; color: var(--text-muted); }
.cmp-nota{ display: block; font-size: 12px; color: var(--text-muted); }
.cmp-tipo{ display: inline-flex; align-items: center; gap: 8px; color: var(--text-primary); }
.cmp-tipo i{ width: 9px; height: 9px; border-radius: 50%; background: var(--tipo); }
.cmp-tipo--otros i{ background: transparent; border: 1.5px dashed var(--tipo); }
.cmp-barra{ display: block; height: 4px; margin-top: 6px; border-radius: 2px; background: var(--surface-alt); overflow: hidden; }
.cmp-barra span{ display: block; height: 100%; border-radius: 2px; }
.cmp-ver{ color: var(--accent); font-weight: 600; text-decoration: none; }
.cmp-ver:hover{ text-decoration: underline; }
.cmp-ver:focus-visible{ outline: 2px solid var(--accent); outline-offset: 2px; }
.cmp-vacio{ color: var(--text-muted); }
.cmp-pie{ margin: 16px 0 0; font-size: 12.5px; color: var(--text-muted); }
@media (max-width: 720px){
  .cmp-selectores{ grid-template-columns: 1fr; }
  .cmp tbody th{ width: auto; min-width: 140px; }
}
`;
