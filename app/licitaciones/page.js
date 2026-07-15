import ProcesosRecientes from "@/src/components/secop/ProcesosRecientes";
import { getProcesosRecientes } from "@/src/lib/secop/recientes";

export const metadata = {
  title: "Licitaciones — HydroStack",
  description:
    "Últimas licitaciones públicas del sector agua y saneamiento básico en Colombia (SECOP II).",
};

// ISR: HTML pre-renderizado, revalidado cada 5 min. Carga instantánea.
export const revalidate = 300;

export default async function LicitacionesPage() {
  const { items } = await getProcesosRecientes();
  return <ProcesosRecientes items={items} />;
}
