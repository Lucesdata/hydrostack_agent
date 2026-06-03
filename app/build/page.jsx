import BuildFlow from "@/src/components/BuildFlow/BuildFlow";

export const metadata = {
  title: "Construye tu sistema — HydroStack",
  description:
    "Flujo guiado paso a paso: ubicación, fosa séptica, mantenimiento e informe técnico PDF.",
};

export default function BuildPage() {
  return <BuildFlow />;
}
