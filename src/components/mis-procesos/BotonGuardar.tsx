"use client";
import { useState } from "react";
import { retornoDeGuardado } from "@/src/lib/mis-procesos/retorno";
import { useCuentaProcesos } from "./ProcesosCuenta";
import styles from "./mis-procesos.module.css";
export default function BotonGuardar({ procesoId, volver }: { procesoId: string; volver: string }) {
  const cuenta = useCuentaProcesos(),
    [ocupado, setOcupado] = useState(false),
    [error, setError] = useState("");
  const retorno = retornoDeGuardado(procesoId, volver);
  if (!cuenta || cuenta.datos.estado === "cargando")
    return (
      <a className={styles.boton} href={retorno}>
        Guardar
      </a>
    );
  if (cuenta.datos.estado === "anonimo")
    return (
      <span className={styles.acceso}>
        <a className={styles.boton} href={`/login?next=${encodeURIComponent(retorno)}`}>
          Guardar · entrar
        </a>
        <a href={`/registro?next=${encodeURIComponent(retorno)}`}>Crear cuenta gratuita</a>
      </span>
    );
  if (cuenta.datos.estado === "error")
    return (
      <span>
        <button className={styles.boton} onClick={() => void cuenta.refrescar()}>
          Reintentar estado
        </button>
        <span role="status">No pudimos verificar tus guardados.</span>
      </span>
    );
  const guardado = cuenta.datos.guardados.includes(procesoId);
  const cambiar = async () => {
    setOcupado(true);
    setError("");
    const version = cuenta.vigente();
    try {
      const r = await fetch(`/api/mis-procesos/guardados/${encodeURIComponent(procesoId)}`, {
        method: guardado ? "DELETE" : "PUT",
        cache: "no-store",
      });
      if (version !== cuenta.vigente()) return;
      if (r.status === 401) {
        await cuenta.refrescar();
        return;
      }
      if (!r.ok) throw new Error("No se pudo completar el guardado.");
      await cuenta.refrescar();
    } catch (e) {
      if (version === cuenta.vigente()) {
        console.error("[mis-procesos] Guardado no confirmado", e);
        setError("No se pudo completar. Inténtalo de nuevo.");
      }
    } finally {
      setOcupado(false);
    }
  };
  return (
    <span>
      <button
        className={styles.boton}
        type="button"
        disabled={ocupado}
        onClick={cambiar}
        aria-pressed={guardado}
        aria-label={guardado ? `Quitar guardado ${procesoId}` : `Guardar ${procesoId}`}
      >
        {ocupado ? "Confirmando…" : guardado ? "Guardado · quitar" : "Guardar"}
      </button>
      {error && <span role="alert">{error}</span>}
    </span>
  );
}
