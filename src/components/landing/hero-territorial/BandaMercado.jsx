"use client";

import { formatConteo, formatCopCompact } from "@/src/components/secop/format";

export default function BandaMercado({ sector, heroStats }) {
  return (
    <section className="aqMercado" aria-labelledby="aq-mercado-titulo">
      <div className="aqMercadoTitulo">
        <span aria-hidden="true" />
        <h2 id="aq-mercado-titulo">El mercado ahora</h2>
      </div>

      <dl>
        <div>
          <dt>Procesos del sector vigilados</dt>
          <dd>{formatConteo(sector?.procesosVigilados ?? null)}</dd>
        </div>
        <div>
          <dt>Nuevos abiertos · 7 días</dt>
          <dd>{formatConteo(heroStats?.nuevos7d ?? null)}</dd>
        </div>
        <div>
          <dt>En juego · este mes · COP</dt>
          <dd>{formatCopCompact(heroStats?.enJuegoTotalCop ?? null)}</dd>
        </div>
      </dl>

      <p>Fuente: SECOP II. — indica un dato no disponible.</p>
    </section>
  );
}
