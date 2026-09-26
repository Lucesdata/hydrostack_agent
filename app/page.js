import ColombiaChoropleth from "@/src/components/mapa/ColombiaChoropleth";
import { ESTILOS_MAPA } from "@/src/components/mapa/estilos";
import PortadaCliente from "@/src/components/landing/PortadaCliente";
import { agregadosPortada } from "@/src/lib/secop/agregados";

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
  // el despliegue a que la base conteste. Mismo criterio que `/api/landing-stats`,
  // que degrada a "—" sin inventar cifras.
  let departamentos = [];
  let totalAbiertos;
  let tipos = [];
  try {
    const agregados = await agregadosPortada();
    departamentos = agregados.departamentos;
    totalAbiertos = agregados.totalAbiertos;
    tipos = agregados.tipos;
  } catch (error) {
    console.error("[portada] agregados no disponibles, el mapa sale vacío:", error);
  }

  return (
    <PortadaCliente
      departamentos={departamentos}
      totalAbiertos={totalAbiertos}
      tipos={tipos}
      mapa={
        <>
          <style dangerouslySetInnerHTML={{ __html: ESTILOS_MAPA }} />
          <ColombiaChoropleth
            filas={departamentos}
            totalAbiertos={totalAbiertos}
            etiquetas
            datosDisponibles={totalAbiertos != null}
          />
        </>
      }
    />
  );
}
