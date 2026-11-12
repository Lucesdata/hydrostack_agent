import { formatCopEscala } from "@/src/components/secop/format";
import type { Metricas } from "@/src/lib/marketplace/tipos";
import s from "./marketplace.module.css";

const n = (v: number) => v.toLocaleString("es-CO");

/**
 * Los indicadores. Solo se pintan cuando hay cobertura: sin datos no se
 * inventan, y un `null` (no se pudo contar) no se confunde con un 0 confirmado.
 * La suma de valores lleva al lado su cobertura: «N de M publican presupuesto».
 */
export default function MetricasHero({
  metricas,
  motivoAusencia,
}: {
  metricas: Metricas | null;
  /** Por qué no hay indicadores, cuando se sabe (búsqueda por número, fuente caída). */
  motivoAusencia?: string;
}) {
  if (!metricas) {
    return motivoAusencia ? <p className={s.nota}>{motivoAusencia}</p> : null;
  }
  const valor = metricas.valorEstimadoCop === null ? null : Number(metricas.valorEstimadoCop);
  return (
    <dl className={s.metricas} aria-label="Indicadores de la consulta">
      <div>
        <dt>Oportunidades activas</dt>
        <dd>{n(metricas.abiertas)}</dd>
      </div>
      <div>
        <dt>Entidades contratantes</dt>
        <dd>{metricas.entidades === null ? "No disponible" : n(metricas.entidades)}</dd>
      </div>
      <div>
        <dt>
          Valor estimado
          {metricas.procesosConValor !== null && metricas.abiertas > 0 ? (
            <small>
              {" "}
              · {n(metricas.procesosConValor)} de {n(metricas.abiertas)} publican presupuesto
            </small>
          ) : null}
        </dt>
        <dd>{valor === null ? "No informado" : formatCopEscala(valor)}</dd>
      </div>
    </dl>
  );
}
