import AdjudicadosVista from "@/src/components/adjudicados/AdjudicadosVista";
import { adjudicadosDelMes, type Adjudicado } from "@/src/lib/secop/adjudicados-mes";
import { mesDelInforme } from "@/src/lib/secop/informe";

/**
 * «Proyectos adjudicados»: los cinco procesos de agua potable y saneamiento
 * básico de mayor valor adjudicado en el último mes completo. Estático y
 * revalidado cada 6 h, como el informe mensual: el mes no cambia entre visitas.
 * La regla de selección vive en `src/lib/secop/adjudicados-mes.ts`.
 */
export const revalidate = 21600;

export async function generateMetadata() {
  const { etiqueta } = mesDelInforme();
  return {
    title: `Proyectos adjudicados · ${etiqueta}`,
    description: `Los cinco proyectos de agua potable y saneamiento básico con mayor valor adjudicado en el SECOP II en ${etiqueta}: entidad, valor, presupuesto y adjudicatario.`,
    alternates: { canonical: "/proyectos-adjudicados" },
  };
}

const fecha = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Bogota",
});

export default async function Page() {
  const mes = mesDelInforme();
  let items: Adjudicado[] | null = null;
  try {
    items = (await adjudicadosDelMes(mes)).items;
  } catch (error) {
    // Sin base (p. ej. en el build), la página sale sin lista en vez de caerse.
    console.error("[proyectos-adjudicados] no disponible:", error);
  }
  return <AdjudicadosVista items={items} mes={mes} generado={fecha.format(new Date())} />;
}
