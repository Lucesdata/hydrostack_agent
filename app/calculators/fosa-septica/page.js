import SepticTankCalculator from "@/components/SepticTankCalculator";

export const metadata = {
  title: "Fosa Séptica — HydroStack",
  description: "Calculadora de fosa séptica. Dimensionamiento según RAS Colombia, España (CTE), EN 12566 y EPA. Volúmenes, cámaras, diseño hidráulico y campo de infiltración.",
};

export default function FosaSepticaPage() {
  return <SepticTankCalculator />;
}
