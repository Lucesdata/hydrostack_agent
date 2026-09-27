"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCopCompact, formatShortDate } from "@/src/components/secop/format";
import type { Competidor } from "@/src/lib/secop/ficha";
import type { HistorialComparable } from "@/src/lib/al/consulta/competidor";

/**
 * §7 de la ficha, «Quién suele competir aquí»: cada rival se despliega con su
 * historial en procesos comparables (mismo tipo, mismo departamento).
 *
 * Sustituye a /competidores/[key] (plan «la ficha como centro», PR 3). La lista
 * llega pintada del servidor, con la ficha; el historial de cada rival se pide
 * al abrirlo, así el render de la ficha no hace una consulta por rival.
 * `<details>` nativo: sin JS se abre, pero no trae el historial y lo dice.
 *
 * El historial exige cuenta gratuita (capacidad `competidores`): la ruta
 * devuelve 401 y aquí se ofrece entrar, volviendo a esta misma ficha.
 */

type Estado =
  | { tipo: "cargando" }
  | { tipo: "listo"; h: HistorialComparable }
  | { tipo: "sin-cuenta" }
  | { tipo: "error" };

const pct = (v: number | null) =>
  v === null || !Number.isFinite(v) ? "—" : `${Math.round(v * 100)} %`;

export default function RivalesFicha({
  rivales,
  procesoId,
  slug,
}: {
  rivales: Competidor[];
  procesoId: string;
  slug: string;
}) {
  return (
    <div className="fi-panel fi-rivales">
      <div className="fi-rival-cab" aria-hidden="true">
        <span>Oferente</span>
        <span className="num">Presentados</span>
        <span className="num">Ganados</span>
      </div>
      <ul className="fi-rival-lista">
        {rivales.map((c) => (
          <li key={c.proveedorKey}>
            <Rival rival={c} procesoId={procesoId} slug={slug} />
          </li>
        ))}
      </ul>
      <p className="fi-n2-nota">
        Histórico de procesos comparables: mismo tipo de proyecto y mismo departamento, ya cerrados.
        No son los oferentes de este proceso — todavía no se sabe quién se presentará. Abre un
        oferente para ver cómo le ha ido aquí.
      </p>
    </div>
  );
}

function Rival({ rival, procesoId, slug }: { rival: Competidor; procesoId: string; slug: string }) {
  const [estado, setEstado] = useState<Estado | null>(null);

  async function cargar() {
    setEstado({ tipo: "cargando" });
    try {
      const res = await fetch(
        `/api/ficha/${encodeURIComponent(procesoId)}/rival/${encodeURIComponent(rival.proveedorKey)}`
      );
      if (res.status === 401) return setEstado({ tipo: "sin-cuenta" });
      if (!res.ok) return setEstado({ tipo: "error" });
      setEstado({ tipo: "listo", h: (await res.json()) as HistorialComparable });
    } catch (e) {
      console.warn("[RivalesFicha] historial no disponible", e);
      setEstado({ tipo: "error" });
    }
  }

  return (
    <details
      className="fi-rival"
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open && estado === null) void cargar();
      }}
    >
      <summary>
        <span className="fi-rival-nombre">{rival.nombre ?? "Sin nombre"}</span>
        <span className="num" aria-label={`${rival.presentados} presentados`}>
          {rival.presentados}
        </span>
        <span className="num" aria-label={`${rival.ganados} ganados`}>
          {rival.ganados}
        </span>
      </summary>
      <div className="fi-rival-cuerpo" aria-live="polite">
        {estado === null && (
          <noscript>El historial de este oferente necesita JavaScript activado.</noscript>
        )}
        {estado?.tipo === "cargando" && <p className="fi-pl-nota">Cargando su historial…</p>}
        {estado?.tipo === "error" && (
          <p className="fi-pl-nota">No se pudo cargar su historial. Inténtalo más tarde.</p>
        )}
        {estado?.tipo === "sin-cuenta" && (
          <p className="fi-pl-nota">
            Su historial en procesos como este —cuántos gana, a qué precio y si tiene multas— pide
            una cuenta gratuita.{" "}
            <Link href={`/registro?next=${encodeURIComponent(`/licitaciones/${slug}`)}`}>
              Crear cuenta
            </Link>{" "}
            ·{" "}
            <Link href={`/login?next=${encodeURIComponent(`/licitaciones/${slug}`)}`}>Entrar</Link>
          </p>
        )}
        {estado?.tipo === "listo" && <Historial h={estado.h} />}
      </div>
    </details>
  );
}

function Historial({ h }: { h: HistorialComparable }) {
  const { sanciones } = h;
  const sinHallazgo = sanciones.directas.length === 0 && sanciones.porProceso.length === 0;

  return (
    <>
      <div className="fi-cifras fi-rival-cifras">
        <Cifra v={`${h.adjudicaciones} de ${h.participaciones}`} l="Ganó aquí" />
        <Cifra v={pct(h.tasaExito)} l="Tasa de acierto" />
        <Cifra v={pct(h.ratioAdjudicadoSobreEstimado)} l="Mediana adjudicado / presupuesto" />
      </div>

      {h.recientes.length > 0 && (
        <>
          <h4 className="fi-rival-h">Sus procesos comparables más recientes</h4>
          <ul className="fi-pl-lista">
            {h.recientes.map((r) => (
              <li key={r.slug}>
                <Link href={`/licitaciones/${r.slug}`}>{r.objeto ?? "Proceso sin objeto"}</Link>
                {" — "}
                {r.adjudicado ? "lo ganó" : "se presentó"}
                {r.entidad ? ` · ${r.entidad}` : ""}
                {r.fecha ? ` · ${formatShortDate(r.fecha)}` : ""}
              </li>
            ))}
          </ul>
        </>
      )}

      <h4 className="fi-rival-h">Multas contractuales</h4>
      {sinHallazgo ? (
        <p className="fi-pl-nota">
          {sanciones.cobertura.cruzablePorDocumento ? (
            "Sin multas registradas a nombre de su NIT en las fuentes consultadas."
          ) : (
            <>
              <strong>No se puede verificar:</strong> no tiene NIT publicado en las adjudicaciones,
              así que no hay documento con el que cruzarlo. No significa que esté limpio.
            </>
          )}
        </p>
      ) : (
        <ul className="fi-pl-lista">
          {sanciones.directas.map((s, i) => (
            <li key={`d${i}`}>
              {s.tipo ?? "Sanción"}
              {s.valorSancion ? ` · ${formatCopCompact(Number(s.valorSancion))}` : ""} ·{" "}
              {s.entidadNombre ?? "—"} · {formatShortDate(s.fechaFirmeza)}
            </li>
          ))}
          {sanciones.porProceso.map((s, i) => (
            <li key={`p${i}`}>
              {s.tipo ?? "Sanción"}
              {s.valorSancion ? ` · ${formatCopCompact(Number(s.valorSancion))}` : ""} —{" "}
              <em>atribución probable</em>: recae sobre un proceso que ganó, no sobre su documento.
            </li>
          ))}
        </ul>
      )}
      <p className="fi-pl-nota">
        Son multas de SECOP, no inhabilidades: una señal para verificar en la fuente oficial. Las
        multas no se recortan a esta zona.
      </p>
    </>
  );
}

function Cifra({ v, l }: { v: string; l: string }) {
  return (
    <div>
      <div className="fi-cifra-v">{v}</div>
      <div className="fi-cifra-l">{l}</div>
    </div>
  );
}
