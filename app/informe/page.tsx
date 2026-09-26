import InformeVista from "@/src/components/informe/InformeVista";
import { totalAbiertos } from "@/src/lib/secop/agregados";
import { informeDelMes, mesDelInforme, type Informe } from "@/src/lib/secop/informe";

/**
 * Informe mensual "El mercado del agua en Colombia". Estático, revalidado cada
 * 6 h como las facetas. Se descarga con la impresión del navegador; no pide
 * correo: recogerlo exige la política de tratamiento de datos (PENDIENTES §18)
 * y enviarlo, el correo configurado (§0).
 */
export const revalidate = 21600;

export async function generateMetadata() {
  const { etiqueta } = mesDelInforme();
  return {
    title: `El mercado del agua en Colombia · ${etiqueta}`,
    description: `Informe de ${etiqueta}: procesos de agua y saneamiento publicados en el SECOP II, presupuesto, tipos de obra, departamentos y entidades que más contratan.`,
    alternates: { canonical: "/informe" },
  };
}

const fecha = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Bogota",
});

export default async function Page() {
  let informe: Informe | null = null;
  let abiertosHoy: number | null = null;
  try {
    [informe, abiertosHoy] = await Promise.all([informeDelMes(), totalAbiertos()]);
  } catch (error) {
    // Sin base (p. ej. en el build), el informe sale sin cifras en vez de caerse.
    console.error("[informe] no disponible:", error);
  }
  return (
    <InformeVista
      informe={informe}
      abiertosHoy={abiertosHoy}
      mes={informe?.mes ?? mesDelInforme()}
      generado={fecha.format(new Date())}
    />
  );
}
