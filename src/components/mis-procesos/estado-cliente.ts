import type { ListasProcesos } from "@/src/lib/mis-procesos/types";
export interface EstadoCuenta {
  estado: "cargando" | "anonimo" | "autenticado" | "error";
  guardados: string[];
  usuarioId?: string;
  listas?: ListasProcesos;
}
export function crearCargaCuenta(
  publicar: (e: EstadoCuenta) => void,
  fetcher: typeof fetch = fetch
) {
  let turno = 0,
    controller: AbortController | undefined;
  const invalidar = () => {
    turno++;
    controller?.abort();
    publicar({ estado: "cargando", guardados: [] });
  };
  return {
    invalidar,
    async cargar(ids: string[], pagina?: number) {
      invalidar();
      const actual = turno;
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const guardados: string[] = [];
        let usuarioId: string | undefined;
        let listas: ListasProcesos | undefined;
        const lotes =
          ids.length && pagina === undefined
            ? Array.from({ length: Math.ceil(ids.length / 25) }, (_, i) =>
                ids.slice(i * 25, i * 25 + 25)
              )
            : [[]];
        for (const lote of lotes) {
          const params =
            pagina !== undefined
              ? `?page=${pagina}`
              : lote.length
                ? `?${new URLSearchParams({ ids: lote.join(",") })}`
                : "?page=1";
          const response = await fetcher(`/api/mis-procesos${params}`, {
            cache: "no-store",
            signal,
          });
          if (actual !== turno || signal.aborted) return;
          if (response.status === 401) {
            publicar({ estado: "anonimo", guardados: [] });
            return;
          }
          if (!response.ok) throw new Error("No se pudo verificar el guardado.");
          const body = await response.json();
          if (usuarioId && usuarioId !== body.usuarioId)
            throw new Error("La sesión cambió durante la consulta.");
          usuarioId = body.usuarioId;
          if (!usuarioId) throw new Error("No se pudo verificar la identidad de la cuenta.");
          if (lote.length) guardados.push(...body.guardados);
          else {
            guardados.push(...body.guardados.map((p: { procesoId: string }) => p.procesoId));
            listas = body;
          }
        }
        if (actual === turno && !signal.aborted)
          publicar({ estado: "autenticado", guardados, usuarioId, listas });
      } catch (error) {
        if (actual !== turno || signal.aborted) return;
        console.error("[mis-procesos] Estado de cuenta no disponible", error);
        publicar({ estado: "error", guardados: [] });
      }
    },
  };
}
