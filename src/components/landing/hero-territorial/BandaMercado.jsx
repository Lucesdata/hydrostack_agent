"use client";

import { formatConteo, formatCopCompact } from "@/src/components/secop/format";

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

export default function BandaMercado({ sector, heroStats }) {
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
        </div>
        <div>
          <Icono d={ICONOS.nuevos} />
          <dt>Nuevos abiertos · 7 días</dt>
          <dd>{formatConteo(heroStats?.nuevos7d ?? null)}</dd>
        </div>
        <div>
          <Icono d={ICONOS.enJuego} />
          <dt>En juego · este mes · COP</dt>
          <dd>{formatCopCompact(heroStats?.enJuegoTotalCop ?? null)}</dd>
        </div>
      </dl>

      <p>Fuente: SECOP II. — indica un dato no disponible.</p>
    </section>
  );
}
