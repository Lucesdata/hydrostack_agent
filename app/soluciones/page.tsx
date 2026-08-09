// app/soluciones/page.tsx

/**
 * /soluciones — landing ligera para quienes llegan con un problema de agua
 * potable o vertimientos, no con un proceso SECOP ya identificado. Versión
 * inicial: sin lógica, sin captura de datos más allá de la señal pasiva de
 * intención (ver src/lib/signals/record-signal.ts). El CTA usa un ancla a un
 * bloque placeholder, no mailto — evita publicar una dirección de contacto
 * que el equipo aún no ha fijado.
 */

import Link from "next/link";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { recordUserSignal } from "@/src/lib/signals/record-signal";

export const metadata = {
  title: "Soluciones — HydroStack",
  description:
    "¿Un problema de agua potable o vertimientos? Te orientamos paso a paso hacia una solución técnica y cómo contratarla.",
};

const STEPS = [
  {
    n: "01",
    title: "Cuéntanos el problema",
    desc: "Describe qué está pasando: fuente, cobertura, vertimiento, normativa que aplica a tu caso.",
  },
  {
    n: "02",
    title: "Opciones técnicas típicas",
    desc: "Te mostramos las soluciones de ingeniería que suelen aplicar a problemas como el tuyo.",
  },
  {
    n: "03",
    title: "Cómo se contrata y financia",
    desc: "Quién puede ejecutarla, qué exige la contratación pública y qué vías de financiación existen.",
  },
];

const STYLE = `
  .clr-sol{ min-height: 100vh; background: var(--bg); padding-top: 48px; }
  .clr-sol-inner{ max-width: 860px; margin: 0 auto; padding: 0 20px 80px; font-family: var(--font-sans); }
  .clr-sol-hero{ padding: 24px 0 40px; border-bottom: 1px dashed var(--line, #DADAD2); margin-bottom: 40px; }
  .clr-sol-h1{ font-size: 28px; line-height: 1.25; font-weight: 600; color: var(--ink-900, #0A1F1C); margin: 0 0 12px; max-width: 560px; }
  .clr-sol-sub{ font-size: 14px; color: var(--ink-600, #525B5A); max-width: 480px; margin: 0; }
  .clr-sol-steps{ display: flex; flex-direction: column; gap: 0; margin-bottom: 48px; }
  .clr-sol-step{ display: flex; gap: 16px; padding: 20px 0; border-bottom: 1px dashed var(--line, #DADAD2); }
  .clr-sol-step:last-child{ border-bottom: none; }
  .clr-sol-step-n{ font: 600 12px var(--font-mono, monospace); color: var(--accent, #0369A1); flex-shrink: 0; padding-top: 2px; }
  .clr-sol-step-title{ font-size: 15px; font-weight: 600; color: var(--ink-900, #0A1F1C); margin: 0 0 4px; }
  .clr-sol-step-desc{ font-size: 13.5px; line-height: 1.55; color: var(--ink-600, #525B5A); margin: 0; max-width: 480px; }
  .clr-sol-cta-block{ padding: 32px 24px; border: 1px solid var(--line, #DADAD2); text-align: center; }
  .clr-sol-cta-note{ font-size: 13px; color: var(--ink-600, #525B5A); margin: 0 0 16px; }
  .clr-sol-cta{
    display: inline-flex; font: 600 13px var(--font-mono, monospace); letter-spacing: .04em;
    color: #fff; background: var(--ink-900, #0A1F1C); text-decoration: none; padding: 12px 22px;
  }
  .clr-sol-cta:hover{ background: var(--accent, #0369A1); }
`;

export default async function SolucionesPage() {
  const user = await getSessionUser();
  if (user) {
    await recordUserSignal(user.id, "comunidad");
  }

  return (
    <main className="clr-sol">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="clr-sol-inner">
        <div className="clr-sol-hero">
          <h1 className="clr-sol-h1">
            ¿Un problema de agua potable o vertimientos? Empecemos por entenderlo.
          </h1>
          <p className="clr-sol-sub">
            No necesitas saber el nombre técnico de lo que te hace falta. Cuéntanos qué está pasando
            y te mostramos el camino: la solución típica, quién puede ejecutarla y cómo se contrata.
          </p>
        </div>

        <div className="clr-sol-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="clr-sol-step">
              <span className="clr-sol-step-n">[{s.n}]</span>
              <div>
                <p className="clr-sol-step-title">{s.title}</p>
                <p className="clr-sol-step-desc">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="clr-sol-cta-block" id="contacto">
          <p className="clr-sol-cta-note">
            Esta sección crecerá con un formulario propio. Por ahora, cuéntanos tu caso y te
            contactamos.
          </p>
          <Link href="#contacto" className="clr-sol-cta">
            [ Cuéntanos tu caso ]
          </Link>
        </div>
      </div>
    </main>
  );
}
