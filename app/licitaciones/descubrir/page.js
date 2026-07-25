import LicitacionesDiscovery from "@/src/components/secop/discovery/LicitacionesDiscovery";

export const metadata = {
  title: "Descubrir licitaciones (mock) — HydroStack",
  description:
    "Prototipo de colecciones inteligentes y búsqueda facetada para licitaciones de agua y saneamiento. Datos de ejemplo, aún no conectado a SECOP II.",
};

export default function LicitacionesDescubrirPage() {
  return <LicitacionesDiscovery />;
}
