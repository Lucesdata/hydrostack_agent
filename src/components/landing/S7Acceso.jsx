import Link from "next/link";
import { ruta, seccionesPorNivel } from "./seccionesHome";

const RUTA_EXPLORAR = ruta("explorar");

/**
 * Qué te llevas sin pagar: el modelo de acceso, dicho una vez y entero.
 *
 * Las tres columnas no son listas escritas a mano: salen de
 * `seccionesPorNivel()`, que agrupa SECCIONES_HOME por su etiqueta de acceso.
 * Añadir una ruta con nombre en NOMBRE_POR_ID la hace aparecer en su columna
 * sin tocar este archivo — que es justo lo que evita que la promesa del home y
 * la puerta real vuelvan a separarse. `nombres.test.ts` lo verifica.
 *
 * Aquí no hay cifras ni precios: la spec deja el contenido comercial del plan
 * pro fuera de alcance, así que la columna pro nombra las funciones y nada más.
 */
export default function S7Acceso() {
  const grupos = seccionesPorNivel();

  return (
    <section className="section-pad" style={{ background: "var(--bg)" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <span style={{ width: 8, height: 8, background: "var(--accent)" }} />
          <span
            style={{
              font: "11px var(--font-jetbrains-mono),monospace",
              color: "var(--accent)",
              letterSpacing: ".08em",
            }}
          >
            Qué te llevas sin pagar
          </span>
        </div>

        <h2
          style={{
            font: "700 var(--step-h2)/1.2 var(--font-ibm-plex-sans-condensed)",
            color: "var(--text-primary)",
            margin: "0 0 40px",
            maxWidth: 760,
          }}
        >
          Todo lo que decide si te presentas se ve sin cuenta
        </h2>

        <div className="grid-cards">
          {grupos.map((g) => {
            const libre = g.nivel === "anonimo";
            return (
              <div
                key={g.nivel}
                style={{
                  position: "relative",
                  border: `1px solid ${libre ? "var(--accent)" : "var(--line)"}`,
                  background: libre ? "var(--surface)" : "transparent",
                  padding: 22,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {/* Las esquinas de plano, el mismo recurso visual que .bp-card
                    usa en las tarjetas de intención del hero. Solo en la
                    columna libre: son la marca de "esto es lo que miras
                    primero". */}
                {libre && (
                  <>
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        top: -1,
                        left: -1,
                        width: 10,
                        height: 10,
                        borderTop: "2px solid var(--accent)",
                        borderLeft: "2px solid var(--accent)",
                      }}
                    />
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        bottom: -1,
                        right: -1,
                        width: 10,
                        height: 10,
                        borderBottom: "2px solid var(--accent)",
                        borderRight: "2px solid var(--accent)",
                      }}
                    />
                  </>
                )}

                <span
                  style={{
                    font: "10px var(--font-jetbrains-mono),monospace",
                    color: libre ? "var(--accent)" : "var(--ink-300)",
                    background: libre ? "var(--accent-faint)" : "transparent",
                    border: `1px solid ${libre ? "var(--accent)" : "var(--line)"}`,
                    padding: "2px 8px",
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    alignSelf: "flex-start",
                  }}
                >
                  {g.etiqueta}
                </span>

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    flexGrow: 1,
                  }}
                >
                  {g.secciones.map((s) => (
                    <li
                      key={s.id}
                      style={{
                        font: "14px/1.5 var(--font-inter)",
                        color: "var(--text-primary)",
                        paddingLeft: 14,
                        borderLeft: `1px solid ${libre ? "var(--accent)" : "var(--line)"}`,
                      }}
                    >
                      {s.nombre}
                    </li>
                  ))}
                </ul>

                {libre && (
                  <Link
                    href={RUTA_EXPLORAR.href}
                    className="tap-target"
                    style={{
                      font: "600 12px var(--font-jetbrains-mono),monospace",
                      color: "var(--accent)",
                      textDecoration: "none",
                    }}
                  >
                    Explorar procesos
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
