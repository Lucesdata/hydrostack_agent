import ColombiaChoropleth from "@/src/components/mapa/ColombiaChoropleth";
import { ESTILOS_MAPA } from "@/src/components/mapa/estilos";
import PortadaCliente from "@/src/components/landing/PortadaCliente";
import { appUrl } from "@/src/lib/app-url";
import { datasetJsonLd, jsonLdSeguro } from "@/src/lib/landing/dataset-jsonld";
import { agregadosPortada } from "@/src/lib/secop/agregados";
import { formatFechaCorta, ultimaActualizacion } from "@/src/lib/secop/actualizacion";
import { resumenNacional } from "@/src/lib/secop/resumen-departamento";

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
  // Si la base no responde, la portada sale con el mapa en gris en vez de
  // caerse. Importa más de lo que parece: el CI corre `npm run build`, que
  // prerenderiza esta ruta, y las rutas facetadas ya evitaron a propósito atar
  // el despliegue a que la base conteste. Se degrada a "—", sin inventar
  // cifras.
  //
  // Los destacados del país y la fecha de la última ingesta se lanzan a la
  // vez, pero solo se esperan si los agregados llegaron: sin base, el cliente
  // puede dejar consultas colgadas en frío durante el build (visto el
  // 2026-09-28: `/` agotaba los 60 s de prerender tres veces). Sin agregados
  // el hero no pinta destacados, así que no hay nada que esperar. Si falla
  // solo uno de los dos, el resultado dice "—" o la línea «actualizado el …»
  // se oculta.
  let departamentos = [];
  let totalAbiertos;
  let destacadosPais = null;
  let actualizado = null;
  const nacional = resumenNacional().then(
    (r) => r.destacados,
    (error) => {
      console.error("[portada] destacados nacionales no disponibles:", error);
      return null;
    }
  );
  const fecha = ultimaActualizacion().then(formatFechaCorta, (error) => {
    console.error("[portada] fecha de actualización no disponible:", error);
    return null;
  });
  try {
    const agregados = await agregadosPortada();
    departamentos = agregados.departamentos;
    totalAbiertos = agregados.totalAbiertos;
    [destacadosPais, actualizado] = await Promise.all([nacional, fecha]);
  } catch (error) {
    console.error("[portada] agregados no disponibles, el mapa sale vacío:", error);
  }

  return (
    <>
      {/* Dataset de schema.org, para Google Dataset Search. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSeguro(datasetJsonLd(appUrl())) }}
      />
      <PortadaCliente
        departamentos={departamentos}
        totalAbiertos={totalAbiertos}
        destacadosPais={destacadosPais}
        actualizado={actualizado}
        mapa={
          <>
            <style dangerouslySetInnerHTML={{ __html: ESTILOS_MAPA }} />
            <ColombiaChoropleth
              filas={departamentos}
              totalAbiertos={totalAbiertos}
              etiquetas
              tooltipExterno
              capaSeleccion
              maxRotulos={5}
              datosDisponibles={totalAbiertos != null}
            />
          </>
        }
      />
    </>
  );
}
