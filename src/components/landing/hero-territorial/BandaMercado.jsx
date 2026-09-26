"use client";

import Link from "next/link";
import { formatConteo, formatCopCompact } from "@/src/components/secop/format";
import { haceCuanto } from "@/src/lib/landing/hace-cuanto";

/** Cuántos procesos recientes caben en la banda sin empujar el resto. */
export const N_RECIENTES = 3;

const fechaCorta = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  timeZone: "America/Bogota",
});

/** "2026-09-24T…" → "24 de sept"; nada si la fecha no se puede leer. */
export function formatFechaCorta(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : fechaCorta.format(d).replace(".", "");
}

/**
 * Los últimos procesos publicados, cada uno con su ficha. Son los mismos del
 * ticker (una sola petición en la portada): solo datos reales, "—" si no hay.
 */
function UltimosProcesos({ recientes }) {
  const status = recientes?.status ?? "empty";
  const items = (recientes?.items ?? []).slice(0, N_RECIENTES);
  return (
    <div className="aqMercadoRecientes">
      <h3>Últimos procesos publicados</h3>
      {status === "live" && items.length > 0 ? (
        <ol>
          {items.map((p) => {
            const lugar = [p.ciudad, p.departamento].filter(Boolean).join(", ");
            const fecha = formatFechaCorta(p.fecha);
            return (
              <li key={p.id}>
                <Link href={p.href}>
                  {p.tipo ? (
                    <span
                      className={`aqMercadoTipo${p.tipo.color.familia === "otros" ? " aqMercadoTipo--otros" : ""}`}
                      style={{ "--tipo": p.tipo.color.oscuro }}
                    >
                      <i aria-hidden="true" />
                      {p.tipo.label}
                    </span>
                  ) : null}
                  <span className="aqMercadoObjeto">{p.objeto}</span>
                  <span className="aqMercadoMeta">
                    {[lugar, p.valor, fecha ? `publicado el ${fecha}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="aqMercadoVacio">{status === "loading" ? "Cargando fichas…" : "—"}</p>
      )}
    </div>
  );
}

const ICONOS = {
  vigilados: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  nuevos: "M12 19V5M6 11l6-6 6 6",
  enJuego:
    "M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.7 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3",
};

function Icono({ d }) {
  return (
    <span className="aqMercadoIcono" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function BandaMercado({ sector, heroStats, recientes = null }) {
  const consultado = haceCuanto(heroStats?.ultimaConsulta ?? null);
  return (
    <section className="aqMercado" aria-labelledby="aq-mercado-titulo">
      <div className="aqMercadoTitulo">
        <span aria-hidden="true" />
        <h2 id="aq-mercado-titulo">El mercado ahora</h2>
      </div>

      <dl>
        <div>
          <Icono d={ICONOS.vigilados} />
          <dt>Procesos del sector vigilados</dt>
          <dd>{formatConteo(sector?.procesosVigilados ?? null)}</dd>
          {/* Las tres cifras no cuentan lo mismo ni salen del mismo sitio: cada
              una dice qué cuenta, visible, no en un tooltip que en móvil no se ve. */}
          <dd className="aqMercadoAlcance">Histórico: abiertos y cerrados</dd>
        </div>
        <div>
          <Icono d={ICONOS.nuevos} />
          <dt>Nuevos abiertos · 7 días</dt>
          <dd>{formatConteo(heroStats?.nuevos7d ?? null)}</dd>
          <dd className="aqMercadoAlcance">Solo abiertos, en presentación de oferta</dd>
        </div>
        <div>
          <Icono d={ICONOS.enJuego} />
          <dt>En juego · este mes · COP</dt>
          <dd>{formatCopCompact(heroStats?.enJuegoTotalCop ?? null)}</dd>
          <dd className="aqMercadoAlcance">Presupuesto de los abiertos publicados este mes</dd>
        </div>
      </dl>

      <UltimosProcesos recientes={recientes} />

      <p>
        Fuente: SECOP II. Los procesos vigilados salen de la base de AquaLicita
        {consultado ? `, que consultó SECOP II ${consultado}` : ""}; las otras dos cifras se
        consultan en directo. — indica un dato no disponible.
      </p>
    </section>
  );
}
