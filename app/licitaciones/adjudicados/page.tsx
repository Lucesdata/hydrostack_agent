import Vitrina from "@/src/components/secop/vitrina/Vitrina";
import { procesosDeVitrina } from "@/src/lib/secop/vitrina";

export const metadata = {
  title: "Adjudicados recientes · AquaLicita",
  description:
    "Procesos de agua y saneamiento adjudicados en los últimos 30 días, con su adjudicatario y su valor.",
};

export const revalidate = 21600;

export default async function AdjudicadosPage() {
  return <Vitrina pagina={await procesosDeVitrina("adjudicados", 1)} />;
}
