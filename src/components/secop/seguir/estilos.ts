/**
 * Estilos de `BotonSeguir`, aparte del componente: un módulo `"use client"` no
 * puede exportar un string a una página de servidor (llegaría una referencia,
 * no el texto). Los inyecta quien monta el botón: la vitrina y la ficha.
 */
export const ESTILOS_SEGUIR = `
.sg { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
.sg-boton {
  font: 600 13px var(--sans);
  color: var(--text-primary);
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 5px 12px;
  cursor: pointer;
  white-space: nowrap;
}
.sg-boton:hover { border-color: var(--accent); color: var(--accent); }
.sg-boton:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.sg-boton--on { color: var(--accent-deep, var(--accent)); border-color: var(--accent); background: var(--surface-alt); }
.sg-boton[aria-disabled="true"] { cursor: default; }
.sg-ayuda, .sg-aviso { font: 12px var(--sans); color: var(--text-muted); }
.sg-aviso:empty { display: none; }
.fi-seguir { margin: 12px 0 0; }
`;
