import ColombiaChoropleth from "@/src/components/mapa/ColombiaChoropleth";
import { ESTILOS_MAPA } from "@/src/components/mapa/estilos";
import PortadaCliente from "@/src/components/landing/PortadaCliente";
import HeroBackground from "@/src/components/landing/hero-territorial/HeroBackground";
import HeroMessage from "@/src/components/landing/hero-territorial/HeroMessage";
import DigitalTwinsPreview from "@/src/components/landing/hero-territorial/DigitalTwinsPreview";
import { appUrl } from "@/src/lib/app-url";
import { datasetJsonLd, jsonLdSeguro } from "@/src/lib/landing/dataset-jsonld";
import { destacadosPortada } from "@/src/lib/secop/destacados-portada";
import { procesosDe } from "@/src/lib/landing/destacados-portada";
import { anclaDe, VIEWBOX_SELECCION } from "@/src/lib/mapa/etiquetas-procesos";
import { conteosPorFamilia } from "@/src/lib/secop/conteos-familia";

/**
 * La portada. Es un componente de SERVIDOR y su contenido vive en
 * `PortadaCliente`, que sí es de cliente.
 *
 * El reparto no es capricho: el mapa departamental importa 62 kB de geometría y
 * calcula 33 caminos SVG. Dentro de un árbol `"use client"` eso viaja al
 * navegador entero; desde aquí lo dibuja el servidor y al cliente solo le llegan
 * los `path` ya pintados. Se entrega por una prop, que es el patrón del hueco
 * `semaforo` en `FilaProceso`.
 */

/**
 * Seis horas, las mismas que las rutas facetadas. Manda la cadencia real de la
 * ingesta, que llega a saltos de dos y tres días: revalidar más a menudo
 * regenera la página para un dato que no ha cambiado.
 */
export const revalidate = 21600;

export default async function Page() {
  // Los procesos del hero: el más relevante de agua potable, de agua residual
  // y de redes, en UNA consulta (spec 2026-10-07-hero-tres-destacados). La
  // misma lista dibuja el mapa (servidor) y las fichas (cliente), así que no
  // pueden enseñar procesos distintos. Como la página es ISR, la elección
  // queda fija en el HTML hasta la siguiente regeneración.
  //
  // Si la base no responde, la portada sale con el mapa base y el aviso de
  // error en lugar de caerse: el CI corre `npm run build`, que prerenderiza
  // esta ruta, y el despliegue no se ata a que la base conteste.
  //
  // Los conteos por familia y departamento colorean el mapa (PR 2 del mismo
  // spec). Van en paralelo y fallan por separado: sin conteos, el mapa sale
  // con los destacados y sin capas.
  const [destacados, conteos] = await Promise.all([
    destacadosPortada().catch((error) => {
      console.error("[portada] destacados del hero no disponibles:", error);
      return null;
    }),
    conteosPorFamilia().catch((error) => {
      console.error("[portada] conteos del mapa no disponibles:", error);
      return null;
    }),
  ]);
  const procesos = procesosDe(destacados);
  // El anclaje de cada departamento con proceso, ya como porcentaje de la caja
  // del mapa: la tarjeta flotante solo necesita dos números, y así la geometría
  // de las islas no viaja al navegador (presupuesto de peso de la portada).
  const anclas = Object.fromEntries(
    procesos.flatMap((p) => {
      const a = anclaDe(p.departamentoCodigo);
      return a
        ? [
            [
              p.departamentoCodigo,
              [
                ((a[0] - VIEWBOX_SELECCION.x) / VIEWBOX_SELECCION.ancho) * 100,
                ((a[1] - VIEWBOX_SELECCION.y) / VIEWBOX_SELECCION.alto) * 100,
              ],
            ],
          ]
        : [];
    })
  );

  return (
    <>
      {/* Dataset de schema.org, para Google Dataset Search. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSeguro(datasetJsonLd(appUrl())) }}
      />
      <PortadaCliente
        destacados={destacados}
        conteos={conteos}
        // Huecos de servidor: next/image y el marcado fijo no viajan en el JS del
        // navegador (presupuesto de peso de la portada).
        anclas={anclas}
        fondo={<HeroBackground />}
        mensaje={<HeroMessage />}
        gemelos={<DigitalTwinsPreview />}
        mapa={
          <>
            <style dangerouslySetInnerHTML={{ __html: ESTILOS_MAPA }} />
            <ColombiaChoropleth filas={[]} seleccion={procesos} conteos={conteos ?? undefined} />
          </>
        }
      />
    </>
  );
}
