import { parametrosBusqueda } from "@/src/lib/secop/busqueda-navegacion";
import type { SecopProceso, SecopQuery, SecopResult } from "@/src/lib/secop/types";

export interface EstadoBusqueda {
  consulta: SecopQuery;
  resultado: SecopResult<SecopProceso> | null;
  error: string | null;
  tipoError?: "validacion" | "servicio";
  cargando: boolean;
}

export function rechazoDeConsulta(consulta: SecopQuery, error: unknown): EstadoBusqueda {
  return {
    consulta,
    resultado: null,
    cargando: false,
    tipoError: "validacion",
    error: error instanceof Error ? error.message : "Revisa los criterios de búsqueda.",
  };
}

/** También descarta respuestas tardías de servidores que no respetan AbortSignal. */
export function crearCargaBusqueda(
  publicar: (estado: EstadoBusqueda) => void,
  fetcher: typeof fetch = fetch
) {
  let secuencia = 0;
  let controller: AbortController | undefined;
  const cancelar = () => {
    secuencia++;
    controller?.abort();
  };
  return {
    cancelar,
    async cargar(consulta: SecopQuery) {
      cancelar();
      const turno = secuencia;
      const actual = new AbortController();
      controller = actual;
      publicar({ consulta, resultado: null, error: null, cargando: true });
      try {
        const response = await fetcher(`/api/secop?${parametrosBusqueda(consulta)}`, {
          signal: actual.signal,
        });
        const payload = await response.json();
        if (turno !== secuencia || actual.signal.aborted) return;
        if (!response.ok) {
          throw new Error(
            typeof payload.error === "string"
              ? payload.error
              : "No pudimos cargar los resultados. Inténtalo de nuevo."
          );
        }
        publicar({ consulta, resultado: payload, error: null, cargando: false });
      } catch (error) {
        if (turno !== secuencia || actual.signal.aborted) return;
        publicar({
          consulta,
          resultado: null,
          cargando: false,
          tipoError: "servicio",
          error:
            error instanceof Error && error.message.startsWith("No ")
              ? error.message
              : "No pudimos cargar los resultados. Inténtalo de nuevo.",
        });
      }
    },
  };
}
