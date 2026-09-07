/** Estilos de `/mis-filtros`. Convención del repo: CSS embebido, sin Tailwind. */

export const STYLE = `
  .clr-flt{ min-height: 100vh; background: var(--bg); cursor: auto; padding-top: 48px; }
  .clr-flt-inner{ max-width: 760px; margin: 0 auto; padding: 0 20px 80px; font-family: var(--font-sans); }
  .clr-flt-title{ font-size: 20px; font-weight: 600; color: var(--ink-900); margin: 0 0 4px; }
  .clr-flt-sub{ font-size: 13px; color: var(--ink-600); margin: 0 0 20px; line-height: 1.6; }
  .clr-flt-link{ color: var(--accent); text-decoration: none; }
  .clr-flt-link:hover{ text-decoration: underline; }

  .clr-flt-actions{ margin-bottom: 16px; }
  .clr-flt-btn{
    background: var(--accent); color: #fff; border: none; font-size: 12.5px; font-weight: 500;
    padding: 9px 16px; border-radius: var(--radius-md); cursor: pointer;
  }
  .clr-flt-btn:disabled{ opacity: .55; cursor: default; }

  .clr-flt-form{
    background: var(--card, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 18px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 14px;
  }
  .clr-flt-row{ display: grid; grid-template-columns: 1fr; gap: 14px; }
  @media (min-width: 620px){ .clr-flt-row{ grid-template-columns: 1fr 1fr; } }
  .clr-flt-label{ display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: var(--ink-900); font-weight: 500; }
  .clr-flt-hint{ font-weight: 400; color: var(--ink-600); font-size: 11.5px; }
  .clr-flt-input{
    background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius-md);
    padding: 8px 11px; font-size: 13px; color: var(--ink-900); font-family: var(--font-sans);
  }
  .clr-flt-input:focus{ outline: none; border-color: var(--accent); }
  .clr-flt-aviso{
    background: var(--accent-faint); border: 1px solid var(--accent-soft); border-radius: var(--radius-md);
    padding: 10px 12px; font-size: 12px; color: var(--ink-900); margin: 0; line-height: 1.55;
  }
  .clr-flt-error{ color: #dc2626; font-size: 12.5px; margin: 0; }

  .clr-flt-list{ list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .clr-flt-card{
    background: var(--card, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 14px 16px;
  }
  .clr-flt-card--off{ opacity: .6; }
  .clr-flt-card-top{ display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .clr-flt-card-name{ font-size: 14px; font-weight: 600; color: var(--ink-900); margin: 0; }
  .clr-flt-badge{
    font-size: 10.5px; font-family: var(--font-mono); color: var(--ink-600);
    border: 1px solid var(--line); border-radius: 999px; padding: 2px 7px; margin-left: 8px;
  }
  .clr-flt-card-btns{ display: flex; gap: 6px; flex-shrink: 0; }
  .clr-flt-mini{
    background: none; border: 1px solid var(--line); border-radius: var(--radius-md);
    font-size: 11.5px; padding: 4px 10px; color: var(--ink-600); cursor: pointer;
  }
  .clr-flt-mini:hover{ border-color: var(--accent); color: var(--accent); }
  .clr-flt-mini--danger:hover{ border-color: #dc2626; color: #dc2626; }
  .clr-flt-card-crit{ font-size: 12.5px; color: var(--ink-600); margin: 6px 0 0; line-height: 1.5; }
  .clr-flt-card-ev{ font-size: 11.5px; font-family: var(--font-mono); color: var(--ink-600); margin: 4px 0 0; }

  .clr-flt-vacio{
    background: var(--card, #fff); border: 1px solid var(--line); border-radius: var(--radius-lg);
    padding: 22px; font-size: 13px; color: var(--ink-600); line-height: 1.6;
  }
  .clr-flt-nota{ font-size: 12px; color: var(--ink-600); line-height: 1.6; margin: 24px 0 0; }
`;
