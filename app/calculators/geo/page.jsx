import GeoPanel from "@/src/components/geo/GeoPanel";
import CalculatorContextBanner from "@/src/components/BuildFlow/CalculatorContextBanner";

export const metadata = {
  title: "Geolocalización del Predio — HydroStack",
  description: "Ubicación en mapa interactivo, datos catastrales, viabilidad SITARD según POT, autoridad ambiental competente y datos climáticos automáticos para el diseño del sistema séptico.",
};

export default function GeoPage() {
  return (
    <>
      <CalculatorContextBanner step={1} />
      <GeoPanel />
    </>
  );
}
