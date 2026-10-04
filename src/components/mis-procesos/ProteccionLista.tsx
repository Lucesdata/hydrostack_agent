"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useCuentaProcesos } from "./ProcesosCuenta";
export default function ProteccionLista({
  children,
  usuarioId,
}: {
  children: ReactNode;
  usuarioId: string;
}) {
  const cuenta = useCuentaProcesos();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (montado && cuenta?.datos.estado === "autenticado" && cuenta.datos.usuarioId !== usuarioId)
    return (
      <p role="status">
        La cuenta cambió. <a href="/mis-procesos">Actualizar mis procesos</a>
      </p>
    );
  if (montado && cuenta?.datos.estado !== "autenticado")
    return (
      <p role="status">
        {cuenta?.datos.estado === "anonimo" ? (
          <a href="/login?next=/mis-procesos">Inicia sesión para ver tus procesos.</a>
        ) : cuenta?.datos.estado === "error" ? (
          <button onClick={() => void cuenta.refrescar()}>Reintentar carga de cuenta</button>
        ) : (
          "Verificando tu cuenta…"
        )}
      </p>
    );
  return children;
}
