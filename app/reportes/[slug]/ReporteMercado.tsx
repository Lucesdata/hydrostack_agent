/**
 * Render del reporte público de mercado (SDD §9).
 *
 * Es el activo de tráfico: indexable, sin datos de ninguna cuenta y con una
 * cifra que se entiende sin leer el resto. Un volcado de JSON no es eso, y era
 * lo que había antes de este componente.
 *
 * Lee el `payload` congelado, no la base: el reporte es permanente.
 */

export interface PayloadMercado {
  departamento?: string;
  n?: number;
  medianaRatio?: number | null;
  p25?: number | null;
  p75?: number | null;
  medianaValorAdjudicado?: string | null;
}

function pct(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(1)} %`;
}

function cop(v: string | null | undefined): string {
  if (!v) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  if (n < 1_000_000) return `$${n.toLocaleString("es-CO")}`;
  return `$${Math.round(n / 1_000_000).toLocaleString("es-CO")} M`;
}

function Cifra({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="clr-rep-cifra">
      <p className="clr-rep-cifra-valor">{valor}</p>
      <p className="clr-rep-cifra-label">{etiqueta}</p>
    </div>
  );
}

export function ReporteMercado({ payload }: { payload: PayloadMercado }) {
  const n = payload.n ?? 0;

  if (n === 0) {
    return (
      <p className="clr-rep-vacio">
        No hay adjudicaciones con presupuesto y valor publicados para este recorte.
      </p>
    );
  }

  return (
    <>
      <p className="clr-rep-lead">
        Sobre <strong>{n.toLocaleString("es-CO")}</strong> adjudicaciones de agua y saneamiento
        {payload.departamento ? ` en ${payload.departamento}` : ""}, la mediana se adjudica al{" "}
        <strong>{pct(payload.medianaRatio)}</strong> del presupuesto oficial de la entidad.
      </p>

      <div className="clr-rep-cifras">
        <Cifra valor={pct(payload.medianaRatio)} etiqueta="Mediana adjudicado / presupuesto" />
        <Cifra valor={pct(payload.p25)} etiqueta="Percentil 25 (más competido)" />
        <Cifra valor={pct(payload.p75)} etiqueta="Percentil 75" />
        <Cifra valor={cop(payload.medianaValorAdjudicado)} etiqueta="Adjudicación mediana" />
      </div>

      <p className="clr-rep-nota">
        Un valor por debajo del 100 % significa que se gana bajando el precio de referencia; por
        encima, que la entidad lo había subestimado. Solo entran adjudicaciones con presupuesto y
        valor publicados: la fuente deja el presupuesto en cero con frecuencia, y esas se excluyen
        en vez de contarlas como cero.
      </p>
    </>
  );
}
