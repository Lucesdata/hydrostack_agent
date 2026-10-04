"use client";
import { useEffect } from "react";
export default function RegistroVisita({ procesoId }: { procesoId: string }) {
  useEffect(() => {
    let registrada = false;
    const controller = new AbortController();
    const registrar = async () => {
      if (registrada || document.visibilityState !== "visible") return;
      registrada = true;
      try {
        const r = await fetch(`/api/mis-procesos/visitas/${encodeURIComponent(procesoId)}`, {
          method: "POST",
          signal: controller.signal,
          cache: "no-store",
        });
        if (!r.ok && r.status !== 401)
          console.error("[mis-procesos] Visita no registrada", r.status);
      } catch (e) {
        if (!controller.signal.aborted) console.error("[mis-procesos] Visita no registrada", e);
      }
    };
    void registrar();
    document.addEventListener("visibilitychange", registrar);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", registrar);
    };
  }, [procesoId]);
  return null;
}
