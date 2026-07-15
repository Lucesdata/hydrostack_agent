import SecopExplorer from "@/src/components/secop/SecopExplorer";

export const metadata = {
  title: "Búsqueda avanzada de licitaciones — HydroStack",
  description:
    "Explorador avanzado de licitaciones y contratos públicos del sector agua y saneamiento básico en Colombia (SECOP II), con filtros y elegibilidad.",
};

export default function ExplorarLicitacionesPage() {
  return <SecopExplorer />;
}
