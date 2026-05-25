import MaintenanceCalculator from "@/src/components/MaintenanceCalculator";

export const metadata = {
  title: "Mantenimiento SITARD — HydroStack",
  description: "Planificador de mantenimiento de sistemas sépticos. Cronograma de vaciados, checklist de inspección, registro de eventos y riesgo de colmatación.",
};

export default function MantenimientoPage() {
  return <MaintenanceCalculator />;
}
