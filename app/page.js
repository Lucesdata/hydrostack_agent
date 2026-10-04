import ColombiaChoropleth from "@/src/components/mapa/ColombiaChoropleth";
import { ESTILOS_MAPA } from "@/src/components/mapa/estilos";
import PortadaCliente from "@/src/components/landing/PortadaCliente";
import { appUrl } from "@/src/lib/app-url";
import { datasetJsonLd, jsonLdSeguro } from "@/src/lib/landing/dataset-jsonld";
import { muestraPortada } from "@/src/lib/secop/muestra-portada";
import { TAMANO_MUESTRA } from "@/src/lib/landing/grupos-portada";

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
  // Los procesos del hero: hasta 30 abiertos, al azar, en UNA consulta; el
  // hero los muestra de cinco en cinco («Ver otros 5 procesos», 2026-10-04). La
  // misma lista dibuja el mapa (servidor) y las minifichas (cliente), así que
  // no pueden enseñar procesos distintos. Como la página es ISR, la selección
  // queda fija en el HTML hasta la siguiente regeneración: estable durante la
  // visita y sin sorteo en el navegador (sin desajustes de hidratación).
  //
  // Si la base no responde, la portada sale con el mapa base y el aviso de
  // error en lugar de caerse: el CI corre `npm run build`, que prerenderiza
  // esta ruta, y el despliegue no se ata a que la base conteste.
  let procesos = null;
  try {
    procesos = await muestraPortada(TAMANO_MUESTRA);
  } catch (error) {
    console.error("[portada] procesos del hero no disponibles:", error);
  }

  return (
    <>
      {/* Dataset de schema.org, para Google Dataset Search. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSeguro(datasetJsonLd(appUrl())) }}
      />
      <PortadaCliente
        procesos={procesos}
        mapa={
          <>
            <style dangerouslySetInnerHTML={{ __html: ESTILOS_MAPA }} />
            <ColombiaChoropleth filas={[]} seleccion={procesos ?? []} />
          </>
        }
      />
    </>
  );
}
