import AdjudicadosVista from "@/src/components/adjudicados/AdjudicadosVista";
import { adjudicadosDelMes, type Adjudicado } from "@/src/lib/secop/adjudicados-mes";
import { mesDelInforme } from "@/src/lib/secop/informe";

/**
 * «Proyectos adjudicados»: los cinco procesos de agua potable y saneamiento
 * básico de mayor valor adjudicado en el último mes completo. Estático y
 * revalidado cada 24 h (decisión del usuario del 2026-11-03): el mes ya está
 * cerrado y no hace falta más. No se alarga más porque el día 1 la página debe
 * pasar al mes nuevo, y el SECOP recibe adjudicaciones registradas con días de
 * retraso que hay que recoger. La regla de selección vive en
 * `src/lib/secop/adjudicados-mes.ts`.
 */
export const revalidate = 86400;

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
