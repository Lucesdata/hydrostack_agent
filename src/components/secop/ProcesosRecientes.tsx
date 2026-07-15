// src/components/secop/ProcesosRecientes.tsx

/**
 * Vista simple "Licitaciones recientes" — momento 1: ver, sin filtrar.
 *
 * Server component presentacional (sin hooks ni fetch propio): recibe los
 * últimos 25 procesos ya resueltos por getProcesosRecientes() y los pinta como
 * tarjetas enlazadas a SECOP. Cero filtros, cero veredicto, cero probe.
 * El workbench completo vive en /licitaciones/explorar.
 *
 * Spec: docs/superpowers/specs/2026-07-15-vista-simple-y-elegibilidad-diferida.md
 */

import Link from "next/link";
import type { ProcesoResumen } from "@/src/lib/secop/recientes";
import { sentenceCaseTitle, formatCopCompact, formatShortDate } from "./format";

export default function ProcesosRecientes({ items }: { items: ProcesoResumen[] }) {
  return (
    <div className="clr-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div className="clr-container">
        <header className="clr-rc-header">
          <div>
            <span className="clr-tag">SECOP II · Datos abiertos</span>
            <h1 className="clr-h1">Licitaciones recientes · Agua y saneamiento</h1>
            <p className="clr-sub">
              Los últimos {items.length || 25} procesos de contratación pública del
              sector agua potable y saneamiento básico en Colombia.
            </p>
          </div>
          <Link href="/licitaciones/explorar" className="clr-rc-advanced">
            Búsqueda avanzada →
          </Link>
        </header>

        {items.length === 0 ? (
          <div className="clr-rc-empty">
            No pudimos cargar los procesos en este momento. Intenta de nuevo en unos
            minutos o usa la <Link href="/licitaciones/explorar">búsqueda avanzada</Link>.
          </div>
        ) : (
          <ul className="clr-rc-list">
            {items.map((p) => {
              const lugar = [p.municipio, p.departamento].filter(Boolean).join(", ");
              const card = (
                <>
                  <div className="clr-rc-top">
                    {p.estado && <span className="clr-rc-state">{p.estado}</span>}
                    <span className="clr-rc-date">{formatShortDate(p.fechaPublicacion)}</span>
                  </div>
                  <p className="clr-rc-title">{sentenceCaseTitle(p.objeto)}</p>
                  <p className="clr-rc-meta">
                    {[p.entidad, lugar].filter(Boolean).join(" · ")}
                  </p>
                  <div className="clr-rc-foot">
                    <span className="clr-rc-val">{formatCopCompact(p.valorEstimado)}</span>
                    {p.url && <span className="clr-rc-open">Ver en SECOP ↗</span>}
                  </div>
                </>
              );
              return (
                <li key={p.id}>
                  {p.url ? (
                    <a
                      className="clr-rc-card"
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {card}
                    </a>
                  ) : (
                    <div className="clr-rc-card">{card}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <aside className="clr-rc-cta">
          <p>
            <strong>¿Te interesa participar en una licitación?</strong> Cuando quieras,
            te ayudamos a ver si tu empresa —o tú como persona natural— cumple los
            requisitos de un proceso. Sin compromiso: primero mira los procesos.
          </p>
          <Link href="/licitaciones/explorar" className="clr-rc-cta-link">
            Ver cómo participar →
          </Link>
        </aside>
      </div>
    </div>
  );
}

const CSS = `
.clr-rc-header{
  display: flex; justify-content: space-between; align-items: flex-end;
  gap: 16px; flex-wrap: wrap; margin-bottom: 20px;
}
.clr-rc-advanced{
  font-size: 13px; color: var(--accent); text-decoration: none; white-space: nowrap;
  padding-bottom: 4px;
}
.clr-rc-advanced:hover{ text-decoration: underline; }

.clr-rc-list{
  list-style: none; margin: 0; padding: 0;
  display: grid; gap: 10px;
}
.clr-rc-card{
  display: flex; flex-direction: column; gap: 5px;
  background: var(--card, #fff);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 13px 16px;
  text-decoration: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
a.clr-rc-card:hover{
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-faint);
}
.clr-rc-top{
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
}
.clr-rc-state{
  font-family: var(--font-mono); font-size: 10px;
  color: var(--warning);
  background: rgba(217,119,6,0.08);
  border-radius: var(--radius-sm);
  padding: 1px 6px;
}
.clr-rc-date{ font-size: 11px; color: var(--ink-600); }
.clr-rc-title{
  margin: 0;
  font-size: 13.5px; font-weight: 500; color: var(--ink-900); line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.clr-rc-meta{
  margin: 0; font-size: 11.5px; color: var(--ink-600);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.clr-rc-foot{
  display: flex; justify-content: space-between; align-items: center; margin-top: 3px;
}
.clr-rc-val{ font-family: var(--font-mono); font-size: 12px; color: var(--ink-900); }
.clr-rc-open{ font-size: 11.5px; color: var(--accent); }

.clr-rc-empty{
  padding: 48px 24px; text-align: center;
  color: var(--ink-600); font-size: var(--fs-sm);
  border: 1px dashed var(--line); border-radius: var(--radius-lg);
}
.clr-rc-empty a{ color: var(--accent); }

.clr-rc-cta{
  margin-top: 22px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  display: flex; justify-content: space-between; align-items: center;
  gap: 16px; flex-wrap: wrap;
  background: var(--accent-faint, rgba(0,0,0,0.02));
}
.clr-rc-cta p{ margin: 0; font-size: 12.5px; color: var(--ink-600); line-height: 1.55; max-width: 62ch; }
.clr-rc-cta strong{ color: var(--ink-900); font-weight: 600; }
.clr-rc-cta-link{
  font-size: 12.5px; font-weight: 500; color: #fff; text-decoration: none;
  background: var(--accent); padding: 8px 16px; border-radius: var(--radius-md);
  white-space: nowrap; transition: opacity 0.15s;
}
.clr-rc-cta-link:hover{ opacity: 0.88; }

@media (max-width: 900px){
  .clr-rc-header{ align-items: flex-start; }
}
`;
