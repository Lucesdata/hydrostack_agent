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

.vt-rejilla { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; list-style: none; margin: 0; padding: 0; }
.vt-rejilla > li { display: flex; }
.vt-rejilla > li > a { flex: 1; }

.vt-vacio { font: 14px var(--sans); color: var(--text-muted); padding: 32px 0; }
.vt-vacio-accion { display: inline-block; margin-top: 10px; font: 600 13px var(--mono); color: var(--accent); }

.vt-pag { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 26px; }
.vt-pag-info { font: 12px var(--mono); color: var(--text-muted); }
.vt-pag-link { font: 600 13px var(--mono); color: var(--accent); }

@media (max-width: 1023px) { .vt-rejilla { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .vt-rejilla { grid-template-columns: 1fr; } .vt-tabs { overflow-x: auto; } }
`;
