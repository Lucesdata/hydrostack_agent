/**
 * Estilos de las pantallas de competidores (SDD módulo 2).
 *
 * Convención del repo: CSS embebido con clases prefijadas y los tokens de
 * `app/globals.css`, igual que `app/mis-coincidencias`. **Este proyecto no usa
 * Tailwind**: unas clases de utilidades renderizarían sin ningún estilo.
 */

export const STYLE = `
  .clr-cmp{ min-height: 100vh; background: var(--bg); cursor: auto; padding-top: 48px; }
  .clr-cmp-inner{ max-width: 900px; margin: 0 auto; padding: 0 20px 80px; font-family: var(--font-sans); }

  .clr-cmp-title{ font-size: 20px; font-weight: 600; color: var(--ink-900); margin: 0 0 4px; }
  .clr-cmp-sub{ font-size: 13px; color: var(--ink-600); margin: 0 0 24px; line-height: 1.55; }
  .clr-cmp-back{ font-size: 12.5px; color: var(--accent); text-decoration: none; display: inline-block; margin-bottom: 14px; }
  .clr-cmp-back:hover{ text-decoration: underline; }

  .clr-cmp-buscar{ display: flex; gap: 8px; margin-bottom: 20px; }
  .clr-cmp-input{
    flex: 1; background: var(--card, #fff); border: 1px solid var(--line);
    border-radius: var(--radius-md); padding: 9px 12px; font-size: 13px;
    color: var(--ink-900); font-family: var(--font-sans);
  }
  .clr-cmp-input:focus{ outline: none; border-color: var(--accent); }
  .clr-cmp-btn{
    background: var(--accent); color: #fff; border: none; font-size: 12.5px; font-weight: 500;
    padding: 9px 16px; border-radius: var(--radius-md); cursor: pointer;
  }

  .clr-cmp-tabla{ width: 100%; border-collapse: collapse; font-size: 13px; }
  .clr-cmp-tabla th{
    text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
    color: var(--ink-600); font-weight: 500; padding: 0 10px 8px; border-bottom: 1px solid var(--line);
  }
  .clr-cmp-tabla td{ padding: 11px 10px; border-bottom: 1px solid var(--line); color: var(--ink-900); vertical-align: top; }
  .clr-cmp-tabla tr:hover td{ background: var(--accent-faint); }
  .clr-cmp-num{ font-family: var(--font-mono); font-size: 12.5px; text-align: right; white-space: nowrap; }
  .clr-cmp-nombre{ color: var(--accent); text-decoration: none; font-weight: 500; }
  .clr-cmp-nombre:hover{ text-decoration: underline; }
  .clr-cmp-nit{ font-family: var(--font-mono); font-size: 11.5px; color: var(--ink-600); display: block; margin-top: 2px; }
  .clr-cmp-scroll{ overflow-x: auto; }

  .clr-cmp-cifras{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 26px; }
  @media (min-width: 700px){ .clr-cmp-cifras{ grid-template-columns: repeat(4, 1fr); } }
  .clr-cmp-cifra{
    background: var(--card, #fff); border: 1px solid var(--line);
    border-radius: var(--radius-lg); padding: 14px 16px;
  }
  .clr-cmp-cifra-v{ font-size: 22px; font-weight: 600; font-family: var(--font-mono); color: var(--ink-900); margin: 0; }
  .clr-cmp-cifra-l{ font-size: 11.5px; color: var(--ink-600); margin: 4px 0 0; line-height: 1.35; }

  .clr-cmp-h2{ font-size: 15px; font-weight: 600; color: var(--ink-900); margin: 30px 0 10px; }
  .clr-cmp-nota{ font-size: 12px; color: var(--ink-600); line-height: 1.6; margin: 10px 0 0; }
  .clr-cmp-vacio{
    background: var(--card, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 22px; font-size: 13px; color: var(--ink-600); line-height: 1.6;
  }

  /* Sanciones: la evidencia y la inferencia NO se pintan igual. */
  .clr-cmp-sancion{
    background: var(--card, #fff); border: 1px solid var(--line);
    border-left: 3px solid #dc2626; border-radius: var(--radius-lg);
    padding: 12px 14px; margin-bottom: 8px;
  }
  .clr-cmp-sancion--inferida{ border-left-color: #d97706; }
  .clr-cmp-sancion-top{ font-size: 13px; font-weight: 600; color: var(--ink-900); margin: 0 0 3px; }
  .clr-cmp-sancion-meta{ font-size: 12px; color: var(--ink-600); margin: 0; }
  .clr-cmp-aviso{
    background: var(--accent-faint); border: 1px solid var(--accent-soft);
    border-radius: var(--radius-md); padding: 12px 14px; font-size: 12px;
    color: var(--ink-900); line-height: 1.6; margin: 10px 0 0;
  }
  .clr-cmp-limpio{
    background: var(--card, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 16px; font-size: 13px; color: var(--ink-600); line-height: 1.6;
  }
`;
