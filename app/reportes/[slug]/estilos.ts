/**
 * Estilos del reporte permanente (SDD §9).
 *
 * Sigue la convención del repo —CSS embebido con clases prefijadas y los tokens
 * de `app/globals.css`, como `app/mis-coincidencias/page.tsx`— y no un framework
 * de utilidades: **este proyecto no usa Tailwind**, así que unas clases
 * `text-sm text-neutral-500` renderizan sin ningún estilo.
 */

export const STYLE = `
  .clr-rep{ min-height: 100vh; background: var(--bg); cursor: auto; padding-top: 48px; }
  .clr-rep-inner{ max-width: 760px; margin: 0 auto; padding: 0 20px 80px; font-family: var(--font-sans); }

  .clr-rep-kicker{ font-size: 11.5px; font-family: var(--font-mono); color: var(--accent); text-transform: uppercase; letter-spacing: .04em; margin: 0 0 6px; }
  .clr-rep-title{ font-size: 22px; font-weight: 600; color: var(--ink-900); margin: 0 0 6px; }
  .clr-rep-sub{ font-size: 13px; color: var(--ink-600); margin: 0 0 28px; }

  .clr-rep-h2{ font-size: 15px; font-weight: 600; color: var(--ink-900); margin: 28px 0 10px; }
  .clr-rep-list{ list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .clr-rep-card{
    background: var(--card, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 14px 16px;
  }
  .clr-rep-card-title{ font-size: 14px; font-weight: 600; color: var(--ink-900); margin: 0 0 3px; }
  .clr-rep-card-meta{ font-size: 12px; color: var(--ink-600); margin: 0; }
  .clr-rep-link{ font-size: 12.5px; color: var(--accent); text-decoration: none; display: inline-block; margin-top: 8px; }
  .clr-rep-link:hover{ text-decoration: underline; }
  .clr-rep-vacio{
    background: var(--card, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 24px; font-size: 13px; color: var(--ink-600);
  }

  /* El diff: lo que convierte una adenda en información. */
  .clr-rep-delta{ margin: 8px 0 0; display: flex; flex-direction: column; gap: 3px; }
  .clr-rep-delta-fila{ display: flex; gap: 8px; font-size: 12px; }
  .clr-rep-delta-campo{ color: var(--ink-600); flex-shrink: 0; }
  .clr-rep-delta-valor{ color: var(--ink-900); font-family: var(--font-mono); }
  .clr-rep-antes{ color: var(--ink-600); text-decoration: line-through; }

  .clr-rep-cifras{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  @media (min-width: 640px){ .clr-rep-cifras{ grid-template-columns: repeat(4, 1fr); } }
  .clr-rep-cifra{
    background: var(--card, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 14px 16px;
  }
  .clr-rep-cifra-valor{ font-size: 22px; font-weight: 600; font-family: var(--font-mono); color: var(--ink-900); margin: 0; }
  .clr-rep-cifra-label{ font-size: 11.5px; color: var(--ink-600); margin: 4px 0 0; line-height: 1.35; }

  .clr-rep-lead{ font-size: 14px; line-height: 1.6; color: var(--ink-900); margin: 0 0 20px; }
  .clr-rep-nota{ font-size: 12px; line-height: 1.6; color: var(--ink-600); margin: 22px 0 0; }
  .clr-rep-json{
    overflow-x: auto; background: var(--card, #fff); border: 1px solid var(--line);
    border-radius: var(--radius-lg); padding: 16px; font-size: 11.5px;
    font-family: var(--font-mono); color: var(--ink-600);
  }
`;
