import Vitrina from "@/src/components/secop/vitrina/Vitrina";
import { procesosDeVitrina } from "@/src/lib/secop/vitrina";

export const metadata = {
  title: "Fichas de procesos · agua y saneamiento en SECOP II",
  description:
    "Fichas claras de los procesos de agua y saneamiento publicados en SECOP II: cuantía, zona, plazo y quién puede participar.",
};

/**
 * Se renderiza en cada petición, no en el build.
 *
 * El plan la quería estática con ISR de 6 h, y no se puede: esta ruta no tiene
 * segmento dinámico, así que Next la prerenderiza al construir, y el build no
 * tiene base de datos. `DATABASE_URL` está marcada como secreta en Vercel y las
 * variables sensibles solo se entregan al runtime, así que el build falla con
 * `TypeError: Invalid URL`. Las rutas facetadas nunca lo sufrieron porque son
 * `[slug]` con `generateStaticParams` vacío: no se construyen, se generan en la
 * primera petición.
 *
 * Tolerar el fallo y construir la página vacía sería peor: con revalidación de
 * 6 h, producción serviría una vitrina vacía hasta seis horas.
 *
 * El coste es una invocación por visita en dos rutas —no en las 43 facetadas ni
 * en las 2.000 fichas—, y a cambio el dato siempre está fresco. Si el tráfico
 * crece, la salida es exponer `DATABASE_URL` al build y volver a ISR.
 */
export const dynamic = "force-dynamic";

export default async function LicitacionesPage() {
  return <Vitrina pagina={await procesosDeVitrina("abiertos", 1)} />;
}
