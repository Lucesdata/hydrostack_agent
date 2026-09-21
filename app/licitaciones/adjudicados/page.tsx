import Vitrina from "@/src/components/secop/vitrina/Vitrina";
import { procesosDeVitrina } from "@/src/lib/secop/vitrina";

export const metadata = {
  // Sin el sufijo: `app/layout.js` ya compone con `template: "%s · AquaLicita"`,
  // y con él aquí el <title> salía duplicado.
  title: "Adjudicados recientes",
  description:
    "Procesos de agua y saneamiento adjudicados en los últimos 30 días, con su adjudicatario y su valor.",
  alternates: { canonical: "/licitaciones/adjudicados" },
};

export const revalidate = 21600;

export default async function AdjudicadosPage() {
  return <Vitrina pagina={await procesosDeVitrina("adjudicados", 1)} />;
}
