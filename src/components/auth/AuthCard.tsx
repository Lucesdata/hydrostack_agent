import type { ReactNode } from "react";

const BENEFICIOS_POR_DEFECTO = [
  "Guarda los procesos que te interesan y vuelve a ellos cuando quieras",
  "Analiza el pliego y ve qué requisitos te piden",
  "Mira cuántas de las 5 compuertas cumples con tu perfil",
  "Recibe alertas de procesos nuevos según tu perfil",
];

/**
 * Shell visual compartido por /login y /registro: tarjeta de formulario junto
 * a un panel de marca con lo que da la cuenta gratuita. En móvil el panel pasa
 * a una franja compacta sobre el formulario.
 */
export function AuthCard({
  figLabel,
  title,
  subtitle,
  etiqueta = "Cuenta gratuita",
  titular = "Encuentra, entiende y gana procesos de agua en Colombia.",
  beneficios = BENEFICIOS_POR_DEFECTO,
  children,
}: {
  figLabel: string;
  title: string;
  subtitle?: string;
  etiqueta?: string;
  titular?: string;
  beneficios?: string[];
  children: ReactNode;
}) {
  return (
    <main className="clr-auth">
      <style dangerouslySetInnerHTML={{ __html: AUTH_CSS }} />
      <div className="clr-auth-shell">
        <aside className="clr-auth-brand" aria-label="Qué incluye tu cuenta">
          <span className="clr-auth-pill">{etiqueta}</span>
          <p className="clr-auth-headline">{titular}</p>
          <ul className="clr-auth-benefits">
            {beneficios.map((b) => (
              <li key={b}>
                <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                  <circle cx="10" cy="10" r="10" fill="rgba(125,211,252,.18)" />
                  <path
                    d="M5.5 10.5l3 3 6-6.5"
                    fill="none"
                    stroke="#7dd3fc"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <p className="clr-auth-source">Datos del SECOP II</p>
        </aside>
        <section className="clr-auth-card">
          <span className="clr-auth-fig-label">{figLabel}</span>
          <h1 className="clr-auth-title">{title}</h1>
          {subtitle && <p className="clr-auth-sub">{subtitle}</p>}
          {children}
        </section>
      </div>
    </main>
  );
}

const AUTH_CSS = `
.clr-auth{
  min-height: calc(100vh - var(--nav-h, 56px));
  display: flex; align-items: center; justify-content: center;
  padding: 40px 20px;
  background: radial-gradient(900px 420px at 15% 0%, rgba(3,105,161,.10), transparent 70%), var(--bg, #FAFAF7);
  font-family: var(--font-sans);
}
.clr-auth-shell{
  width: 100%; max-width: 960px; display: grid; grid-template-columns: 1fr 1fr;
  border-radius: 20px; overflow: hidden;
  box-shadow: 0 24px 60px -24px rgba(12,74,110,.35), 0 2px 8px rgba(12,74,110,.08);
  border: 1px solid var(--line);
}
.clr-auth-brand{
  display: flex; flex-direction: column; gap: 22px; justify-content: center;
  padding: 44px 40px; color: #e8f4fc;
  background: radial-gradient(500px 300px at 100% 0%, rgba(125,211,252,.22), transparent 70%),
    linear-gradient(160deg, #0369a1 0%, #0c3a5c 55%, #0b2540 100%);
}
.clr-auth-pill{
  align-self: flex-start; font: 600 11px var(--font-mono); letter-spacing: .1em; text-transform: uppercase;
  color: #bae6fd; border: 1px solid rgba(186,230,253,.4); border-radius: 999px; padding: 5px 12px;
}
.clr-auth-headline{ margin: 0; font-size: 28px; line-height: 1.2; font-weight: 700; color: #fff; letter-spacing: -.01em; }
.clr-auth-benefits{ list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
.clr-auth-benefits li{ display: flex; gap: 12px; align-items: flex-start; font-size: 14.5px; line-height: 1.45; color: #d6ecf9; }
.clr-auth-benefits svg{ flex-shrink: 0; margin-top: 1px; }
.clr-auth-source{ margin: 6px 0 0; font: 11.5px var(--font-mono); color: #9cc9e4; letter-spacing: .03em; }
.clr-auth-card{ background: var(--surface, #fff); padding: 44px 40px; }
.clr-auth-fig-label{
  display: block; margin-bottom: 10px; font: 600 11px var(--font-mono); color: var(--accent);
  letter-spacing: .12em; text-transform: uppercase;
}
.clr-auth-title{ font-size: 28px; font-weight: 700; color: var(--ink-900); margin: 0 0 8px; letter-spacing: -.01em; }
.clr-auth-sub{ font-size: 14.5px; color: var(--ink-600); margin: 0 0 24px; line-height: 1.5; }
@media (max-width: 820px){
  .clr-auth{ padding: 20px 16px 32px; align-items: flex-start; }
  .clr-auth-shell{ grid-template-columns: 1fr; border-radius: 16px; }
  .clr-auth-brand{ padding: 22px 22px 24px; gap: 14px; }
  .clr-auth-headline{ font-size: 20px; }
  .clr-auth-benefits{ gap: 8px; }
  .clr-auth-benefits li{ font-size: 13.5px; }
  .clr-auth-benefits li:nth-child(n+3){ display: none; }
  .clr-auth-source{ display: none; }
  .clr-auth-card{ padding: 26px 22px 28px; }
  .clr-auth-title{ font-size: 24px; }
}
.clr-auth-field{ display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.clr-auth-label{
  font: 600 11px var(--font-mono); color: var(--ink-600);
  letter-spacing: .06em; text-transform: uppercase;
}
.clr-auth-input{
  width: 100%; padding: 12px 14px; font-size: 15px; color: var(--ink-900);
  border: 1px solid var(--line); border-radius: 10px; background: #fff;
  transition: border-color .15s, box-shadow .15s;
}
.clr-auth-input:focus{ outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(3,105,161,.18); }
.clr-auth-btn{
  width: 100%; background: var(--accent-fill, #0369a1); color: #fff; border: none; border-radius: 10px;
  font: 600 15px var(--font-sans);
  padding: 13px 16px; cursor: pointer; margin-top: 6px;
  box-shadow: 0 6px 16px -6px rgba(3,105,161,.6); transition: background .15s, transform .15s;
}
.clr-auth-btn:hover{ background: var(--accent-fill-hover, #0c4a6e); transform: translateY(-1px); }
.clr-auth-btn:disabled{ opacity: .6; cursor: wait; }
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
  border-radius: 10px; font-size: 14.5px; font-weight: 500;
  padding: 12px 16px; cursor: pointer;
}
.clr-auth-google:hover{ border-color: var(--accent-soft, var(--accent)); }
.clr-auth-resend{ margin-top: 16px; border-top: 1px dashed var(--line); padding-top: 14px; }
.clr-auth-resend-toggle{
  font: 12px var(--font-mono); color: var(--accent);
  cursor: pointer; letter-spacing: .04em; list-style: none;
}
.clr-auth-resend-toggle::-webkit-details-marker{ display: none; }
.clr-auth-resend-toggle::before{ content: "+ "; }
.clr-auth-resend[open] .clr-auth-resend-toggle::before{ content: "− "; }
.clr-auth-resend-toggle:hover{ text-decoration: underline; }
.clr-auth-resend-form{ display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
.clr-auth-btn-secondary{
  width: 100%; background: transparent; color: var(--ink-900);
  border: 1px solid var(--line); border-radius: var(--radius-md);
  font: 500 13px var(--font-sans); padding: 9px 16px; cursor: pointer; margin-top: 4px;
}
.clr-auth-btn-secondary:hover{ border-color: var(--accent); color: var(--accent); }
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
