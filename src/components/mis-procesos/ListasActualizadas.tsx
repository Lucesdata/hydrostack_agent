"use client";
import type { ListasProcesos } from "@/src/lib/mis-procesos/types";
import { useCuentaProcesos } from "./ProcesosCuenta";
import ListasMisProcesos from "./ListasMisProcesos";
export default function ListasActualizadas({ iniciales }: { iniciales: ListasProcesos }) {
  const cuenta = useCuentaProcesos();
  return <ListasMisProcesos listas={cuenta?.datos.listas ?? iniciales} />;
}
