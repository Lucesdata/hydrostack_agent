/** Estilos de `/auditoria`. Convención del repo: CSS embebido, sin Tailwind. */

export const STYLE = `
  .clr-aud{ min-height: 100vh; background: var(--bg); cursor: auto; padding-top: 48px; }
  .clr-aud-inner{ max-width: 800px; margin: 0 auto; padding: 0 20px 80px; font-family: var(--font-sans); }
  .clr-aud-title{ font-size: 20px; font-weight: 600; color: var(--ink-900); margin: 0 0 4px; }
  .clr-aud-sub{ font-size: 13px; color: var(--ink-600); margin: 0 0 8px; line-height: 1.6; }
  .clr-aud-link{ color: var(--accent); text-decoration: none; }
  .clr-aud-link:hover{ text-decoration: underline; }
  .clr-aud-h2{ font-size: 15px; font-weight: 600; color: var(--ink-900); margin: 28px 0 8px; }
  .clr-aud-nota{ font-size: 12px; color: var(--ink-600); line-height: 1.6; margin: 0 0 14px; }

  .clr-aud-motivos{ list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .clr-aud-motivo{
    display: flex; align-items: baseline; gap: 12px; text-decoration: none;
    background: var(--card, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 11px 14px;
  }
  .clr-aud-motivo:hover{ border-color: var(--accent); }
  .clr-aud-motivo--on{ border-color: var(--accent); background: var(--accent-faint); }
  .clr-aud-motivo-n{
    font-family: var(--font-mono); font-size: 14px; font-weight: 600; color: var(--ink-900);
    min-width: 56px; text-align: right;
  }
  .clr-aud-motivo-t{ font-size: 12.5px; color: var(--ink-900); line-height: 1.45; }
  .clr-aud-capa{
    display: block; font-size: 11px; font-family: var(--font-mono); color: var(--ink-600); margin-top: 2px;
  }

  .clr-aud-list{ list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .clr-aud-card{
    background: var(--card, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 12px 14px;
  }
  .clr-aud-card-obj{ font-size: 13px; color: var(--ink-900); margin: 0 0 5px; line-height: 1.45; }
  .clr-aud-card-meta{ font-size: 11.5px; color: var(--ink-600); margin: 0; line-height: 1.5; }
  .clr-aud-tag{
    font-family: var(--font-mono); font-size: 11px; color: var(--accent);
    background: var(--accent-faint); border: 1px solid var(--accent-soft);
    border-radius: 999px; padding: 2px 8px;
  }
  .clr-aud-card-id{ font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-600); margin: 5px 0 0; }

  .clr-aud-vacio{
    background: var(--card, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 22px; font-size: 13px; color: var(--ink-600); line-height: 1.6;
  }
`;
