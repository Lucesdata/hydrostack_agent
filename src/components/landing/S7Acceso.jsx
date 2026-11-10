import Link from "next/link";
import { ruta, seccionesPorNivel } from "./seccionesHome";

const RUTA_EXPLORAR = ruta("explorar");

/**
 * Qué te llevas sin pagar: el modelo de acceso, dicho una vez y entero.
 *
 * Las columnas no son listas escritas a mano: salen de
 * `seccionesPorNivel()`, que agrupa SECCIONES_HOME por su etiqueta de acceso.
 * Añadir una ruta con nombre en NOMBRE_POR_ID la hace aparecer en su columna
 * sin tocar este archivo — que es justo lo que evita que la promesa del home y
 * la puerta real vuelvan a separarse. `nombres.test.ts` lo verifica.
 *
 * Diseño (2026-10-12): cabecera de marca como la de /login y /registro, y una
 * tarjeta por nivel con checks y su llamada a la acción. Solo cambia la
 * presentación; el contenido sigue saliendo del catálogo.
 *
 * Aquí no hay cifras ni precios: la spec deja el contenido comercial del plan
 * pro fuera de alcance, así que la columna pro nombra las funciones y nada más.
 * Hoy no hay ninguna función de pago y esa columna no se pinta (ver
 * `seccionesPorNivel`).
 */
export default function S7Acceso() {
  const grupos = seccionesPorNivel();

  return (
    <section className="aq-precios">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header className="aq-precios-hero">
        <span className="aq-precios-pill">Precios y acceso</span>
        <h1 className="aq-precios-title">Todo lo que decide si te presentas se ve sin cuenta</h1>
        <p className="aq-precios-lead">
          Hoy todo AquaLicita es gratis. Explora sin registrarte; crea una cuenta gratuita para
          guardar procesos, medir tu encaje y analizar pliegos.
        </p>
      </header>

      <div className="aq-precios-grid">
        {grupos.map((g) => {
          const libre = g.nivel === "anonimo";
          return (
            <article
              key={g.nivel}
              className={`aq-precios-card${libre ? "" : " aq-precios-card--destacada"}`}
            >
              {!libre && <span className="aq-precios-flag">Recomendado</span>}
              <h2 className="aq-precios-name">{g.etiqueta}</h2>
              <p className="aq-precios-price">
                Gratis
                <span>{libre ? "sin registrarte" : "con tu correo o con Google"}</span>
              </p>

              <ul className="aq-precios-list">
                {g.secciones.map((s) => (
                  <li key={s.id}>
                    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                      <circle cx="10" cy="10" r="10" className="aq-precios-check-bg" />
                      <path
                        d="M5.5 10.5l3 3 6-6.5"
                        fill="none"
                        className="aq-precios-check"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{s.nombre}</span>
                  </li>
                ))}
              </ul>

              {libre ? (
                <Link href={RUTA_EXPLORAR.href} className="aq-precios-cta aq-precios-cta--ghost">
                  Explorar procesos
                </Link>
              ) : (
                <Link href="/registro" className="aq-precios-cta">
                  Crear cuenta gratis
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

const CSS = `
.aq-precios{ max-width: 960px; margin: 0 auto; font-family: var(--font-sans); }
.aq-precios-hero{
  text-align: center; color: #e8f4fc; border-radius: 20px; padding: 48px 28px;
  background: radial-gradient(500px 300px at 100% 0%, rgba(125,211,252,.22), transparent 70%),
    linear-gradient(160deg, #0369a1 0%, #0c3a5c 55%, #0b2540 100%);
  box-shadow: 0 24px 60px -28px rgba(12,74,110,.45);
}
.aq-precios-pill{
  display: inline-block; font: 600 11px var(--font-mono); letter-spacing: .1em; text-transform: uppercase;
  color: #bae6fd; border: 1px solid rgba(186,230,253,.4); border-radius: 999px; padding: 5px 12px;
}
.aq-precios-title{ margin: 18px auto 12px; max-width: 640px; font-size: clamp(26px, 4vw, 38px); line-height: 1.15; font-weight: 700; color: #fff; letter-spacing: -.01em; }
.aq-precios-lead{ margin: 0 auto; max-width: 560px; font-size: 16px; line-height: 1.55; color: #d6ecf9; }
.aq-precios-grid{
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: 20px; margin-top: -28px; padding: 0 20px; position: relative;
}
.aq-precios-card{
  position: relative; display: flex; flex-direction: column; gap: 16px;
  background: var(--surface, #fff); border: 1px solid var(--line); border-radius: 16px; padding: 28px 26px;
  box-shadow: 0 12px 32px -18px rgba(12,74,110,.35);
}
.aq-precios-card--destacada{ border: 2px solid var(--accent-fill, #0369a1); }
.aq-precios-flag{
  position: absolute; top: -12px; right: 20px; background: var(--accent-fill, #0369a1); color: #fff;
  font: 600 11px var(--font-mono); letter-spacing: .08em; text-transform: uppercase; padding: 4px 12px; border-radius: 999px;
}
.aq-precios-name{ margin: 0; font: 600 12px var(--font-mono); letter-spacing: .1em; text-transform: uppercase; color: var(--accent); }
.aq-precios-price{ margin: 0; font-size: 40px; line-height: 1; font-weight: 700; color: var(--ink-900); letter-spacing: -.02em; }
.aq-precios-price span{ display: block; margin-top: 8px; font-size: 13.5px; font-weight: 400; letter-spacing: 0; color: var(--ink-600); }
.aq-precios-list{ list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; flex-grow: 1; }
.aq-precios-list li{ display: flex; gap: 10px; align-items: flex-start; font-size: 15px; line-height: 1.45; color: var(--ink-900); }
.aq-precios-list svg{ flex-shrink: 0; margin-top: 1px; }
.aq-precios-check-bg{ fill: rgba(3,105,161,.12); }
.aq-precios-check{ stroke: var(--accent-fill, #0369a1); }
.aq-precios-cta{
  display: block; text-align: center; text-decoration: none; font: 600 15px var(--font-sans);
  padding: 13px 16px; border-radius: 10px; color: #fff; background: var(--accent-fill, #0369a1);
  box-shadow: 0 6px 16px -6px rgba(3,105,161,.6); transition: background .15s, transform .15s;
}
.aq-precios-cta:hover{ background: var(--accent-fill-hover, #0c4a6e); transform: translateY(-1px); }
.aq-precios-cta--ghost{
  background: transparent; color: var(--accent-fill, #0369a1); box-shadow: none;
  border: 1px solid var(--accent-fill, #0369a1);
}
.aq-precios-cta--ghost:hover{ background: rgba(3,105,161,.08); }
@media (max-width: 640px){
  .aq-precios-hero{ padding: 32px 20px 48px; border-radius: 16px; }
  .aq-precios-grid{ padding: 0 8px; }
}
`;
