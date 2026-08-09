import type { ReactNode } from "react";

/**
 * Shell visual compartido por /login y /registro — misma familia de
 * "plano de ingeniería" que app/page.js (etiqueta Fig. NN, tarjeta con
 * esquinas tipo plano) para que el auth no se vea como una plantilla
 * genérica.
 */
export function AuthCard({
  figLabel,
  title,
  subtitle,
  children,
}: {
  figLabel: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="clr-auth">
      <style dangerouslySetInnerHTML={{ __html: AUTH_CSS }} />
      <div className="clr-auth-wrap">
        <div className="clr-auth-fig">
          <span className="clr-auth-fig-dot" />
          <span className="clr-auth-fig-label">{figLabel}</span>
        </div>
        <div className="clr-auth-card">
          <span className="clr-auth-corner clr-auth-corner-tl" />
          <span className="clr-auth-corner clr-auth-corner-tr" />
          <span className="clr-auth-corner clr-auth-corner-bl" />
          <span className="clr-auth-corner clr-auth-corner-br" />
          <h1 className="clr-auth-title">{title}</h1>
          {subtitle && <p className="clr-auth-sub">{subtitle}</p>}
          {children}
        </div>
      </div>
    </main>
  );
}

const AUTH_CSS = `
.clr-auth{
  min-height: calc(100vh - var(--nav-h, 56px));
  display: flex; align-items: center; justify-content: center;
  padding: 48px 20px; background: var(--bg, #FAFAF7);
  font-family: var(--font-sans);
}
.clr-auth-wrap{ width: 100%; max-width: 400px; }
.clr-auth-fig{ display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.clr-auth-fig-dot{ width: 8px; height: 8px; background: var(--accent); flex-shrink: 0; }
.clr-auth-fig-label{
  font: 11px var(--font-mono); color: var(--accent);
  letter-spacing: .12em; text-transform: uppercase;
}
.clr-auth-card{
  position: relative; background: var(--surface, #fff);
  border: 1px solid var(--line); padding: 28px 26px;
}
.clr-auth-corner{ position: absolute; width: 12px; height: 12px; }
.clr-auth-corner-tl{ top: -1px; left: -1px; border-top: 2px solid var(--accent); border-left: 2px solid var(--accent); }
.clr-auth-corner-tr{ top: -1px; right: -1px; border-top: 2px solid var(--accent); border-right: 2px solid var(--accent); }
.clr-auth-corner-bl{ bottom: -1px; left: -1px; border-bottom: 2px solid var(--accent); border-left: 2px solid var(--accent); }
.clr-auth-corner-br{ bottom: -1px; right: -1px; border-bottom: 2px solid var(--accent); border-right: 2px solid var(--accent); }
.clr-auth-title{ font-size: 18px; font-weight: 600; color: var(--ink-900); margin: 0 0 6px; }
.clr-auth-sub{ font-size: 13px; color: var(--ink-600); margin: 0 0 20px; line-height: 1.5; }
.clr-auth-field{ display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.clr-auth-label{
  font: 11px var(--font-mono); color: var(--ink-600);
  letter-spacing: .06em; text-transform: uppercase;
}
.clr-auth-input{
  width: 100%; padding: 10px 12px; font-size: 13px; color: var(--ink-900);
  border: 1px solid var(--line); border-radius: var(--radius-md); background: #fff;
}
.clr-auth-input:focus{ outline: none; border-color: var(--accent); }
.clr-auth-btn{
  width: 100%; background: var(--ink-900, #0A1F1C); color: #fff; border: none;
  font: 600 13px var(--font-mono); letter-spacing: .04em;
  padding: 11px 16px; cursor: pointer; margin-top: 4px;
}
.clr-auth-btn:hover{ opacity: .92; }
.clr-auth-divider{
  display: flex; align-items: center; gap: 10px; margin: 20px 0;
  font: 12px var(--font-sans); color: var(--ink-300, #6B746F);
}
.clr-auth-divider::before, .clr-auth-divider::after{
  content: ""; flex: 1; border-top: 1px dashed var(--line);
}
.clr-auth-google{
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
  background: #fff; color: var(--ink-900); border: 1px solid var(--line);
  border-radius: var(--radius-md); font-size: 13px; font-weight: 500;
  padding: 10px 16px; cursor: pointer;
}
.clr-auth-google:hover{ border-color: var(--accent-soft, var(--accent)); }
.clr-auth-foot{ margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 13px; color: var(--ink-600); text-align: center; }
.clr-auth-foot a{ color: var(--accent); font-weight: 500; text-decoration: none; }
.clr-auth-foot a:hover{ text-decoration: underline; }
.clr-auth-msg{
  font-size: 12.5px; padding: 10px 12px; border-radius: var(--radius-md);
  margin-bottom: 16px; line-height: 1.5;
}
.clr-auth-msg--error{ background: #FEF2F2; color: #B91C1C; border: 1px solid #FCA5A5; }
.clr-auth-msg--notice{ background: #F0F9FF; color: #075985; border: 1px solid #7DD3FC; }
`;
