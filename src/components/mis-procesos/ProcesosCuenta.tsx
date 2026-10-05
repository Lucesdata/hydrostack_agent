"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { crearCargaCuenta, type EstadoCuenta } from "./estado-cliente";
const Contexto = createContext<{
  datos: EstadoCuenta;
  refrescar: () => Promise<void>;
  vigente: () => number;
} | null>(null);
export function useCuentaProcesos() {
  return useContext(Contexto);
}
export default function ProcesosCuenta({
  ids,
  children,
  pagina,
}: {
  ids: string[];
  children: ReactNode;
  pagina?: number;
}) {
  const [datos, setDatos] = useState<EstadoCuenta>({ estado: "cargando", guardados: [] });
  const version = useRef(0),
    contenedor = useRef<HTMLDivElement>(null);
  const carga = useMemo(() => crearCargaCuenta(setDatos), []);
  const clave = [...new Set(ids)].join(",");
  const refrescar = async () => {
    version.current++;
    await carga.cargar(clave ? clave.split(",") : [], pagina);
    if (contenedor.current) contenedor.current.style.visibility = "visible";
  };
  useEffect(() => {
    const generacion = version;
    const actualizar = () => {
      void refrescar();
    };
    const ocultar = () => {
      generacion.current++;
      carga.invalidar();
      if (contenedor.current) contenedor.current.style.visibility = "hidden";
    };
    const visible = () => {
      if (document.visibilityState === "visible") actualizar();
    };
    actualizar();
    window.addEventListener("focus", actualizar);
    window.addEventListener("pageshow", actualizar);
    window.addEventListener("pagehide", ocultar);
    window.addEventListener("aqualicita:logout", ocultar);
    document.addEventListener("visibilitychange", visible);
    return () => {
      generacion.current++;
      carga.invalidar();
      window.removeEventListener("focus", actualizar);
      window.removeEventListener("pageshow", actualizar);
      window.removeEventListener("pagehide", ocultar);
      window.removeEventListener("aqualicita:logout", ocultar);
      document.removeEventListener("visibilitychange", visible);
    };
    // clave captura exactamente el conjunto visible; cada cambio cancela la lectura anterior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, carga, pagina]);
  return (
    <Contexto.Provider value={{ datos, refrescar, vigente: () => version.current }}>
      <div ref={contenedor}>{children}</div>
    </Contexto.Provider>
  );
}
