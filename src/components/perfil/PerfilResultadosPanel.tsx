"use client";

/**
 * Panel de coincidencias en vivo para /perfil — consulta
 * POST /api/perfil/preview con debounce mientras el usuario edita el
 * borrador del perfil, sin que eso lo guarde. Ver
 * docs/superpowers/specs/2026-08-19-panel-progresivo-coincidencias-design.md.
 */
import { useEffect, useRef, useState } from "react";
import type { OferenteProfile } from "@/src/lib/oferente/types";
import type { PreviewEjemplo, PreviewResponse } from "@/app/api/perfil/preview/route";

type PanelStatus = "idle" | "loading" | "ready" | "error";

const DEBOUNCE_MS = 600;

function formatCop(valor: number | null): string {
  if (valor == null) return "valor no informado";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

export function PerfilResultadosPanel({
  perfil,
  guardadoOk,
}: {
  perfil: OferenteProfile;
  guardadoOk: boolean;
}) {
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [count, setCount] = useState(0);
  const [ejemplos, setEjemplos] = useState<PreviewEjemplo[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);
  const perfilJson = JSON.stringify(perfil);

  useEffect(() => {
    async function consultar() {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = ++requestIdRef.current;

      setStatus("loading");
      try {
        const res = await fetch("/api/perfil/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: perfilJson,
          signal: controller.signal,
        });
        if (requestId !== requestIdRef.current) return;
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const data = (await res.json()) as PreviewResponse;
        if (requestId !== requestIdRef.current) return;
        setCount(data.count);
        setEjemplos(data.ejemplos);
        setStatus("ready");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (requestId !== requestIdRef.current) return;
        setStatus("error");
      }
    }

    if (!mountedRef.current) {
      mountedRef.current = true;
      consultar();
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(consultar, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfilJson]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return (
    <aside style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Coincidencias con tu perfil</h3>

      {status === "loading" && <p>Calculando…</p>}
      {status === "error" && <p>No pudimos calcular coincidencias ahora mismo.</p>}

      {(status === "ready" || status === "idle") && (
        <>
          <p>
            <strong>{count}</strong> proceso{count === 1 ? "" : "s"} coincide
            {count === 1 ? "" : "n"} con tu perfil.
          </p>
          {ejemplos.length > 0 && (
            <ul style={{ paddingLeft: 18 }}>
              {ejemplos.map((e, i) => (
                <li key={i}>
                  {e.nombre} — {e.entidad} — {formatCop(e.valor)}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {guardadoOk ? (
        <a href="/mis-coincidencias">Ver todas en Mis coincidencias →</a>
      ) : (
        <span
          title="Guarda tu perfil para verlas aquí"
          style={{ color: "#888", cursor: "not-allowed" }}
        >
          Ver todas en Mis coincidencias →
        </span>
      )}
    </aside>
  );
}
