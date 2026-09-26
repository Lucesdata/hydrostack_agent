import Link from "next/link";
import { ESTILOS_LISTA } from "@/src/components/secop/lista/estilos";
import Comparador from "@/src/components/secop/comparador/Comparador";
import { ESTILOS_COMPARADOR } from "@/src/components/secop/comparador/estilos";
import {
  detallePorDepartamento,
  totalAbiertos,
  type FilaDepartamento,
} from "@/src/lib/secop/agregados";

/**
 * Comparador de departamentos. Estática y revalidada cada 6 h, como las
 * facetas: las filas son las mismas de la ficha del hero y la selección vive
 * en el hash de la URL, que no llega al servidor (`src/lib/secop/comparador.ts`).
 */
export const revalidate = 21600;

export const metadata = {
  title: "Comparar departamentos · Licitaciones de agua y saneamiento",
  description:
    "Hasta tres departamentos lado a lado: procesos abiertos de agua y saneamiento, dinero en juego, entidades que contratan y tipos de obra, con datos del SECOP II.",
  alternates: { canonical: "/licitaciones/comparar" },
};

export default async function Page() {
  let departamentos: FilaDepartamento[] = [];
  let total: number | null = null;
  try {
    [departamentos, total] = await Promise.all([detallePorDepartamento(), totalAbiertos()]);
  } catch (error) {
    // Sin base (p. ej. en el build), la página sale sin datos en vez de caerse.
    console.error("[licitaciones/comparar] no disponible:", error);
  }

  return (
    <div className="clr-page">
      <style dangerouslySetInnerHTML={{ __html: ESTILOS_LISTA + ESTILOS_COMPARADOR }} />
      <div className="clr-container">
        <header className="lp-cab">
          <nav className="lp-cab-migas" aria-label="Ruta de navegación">
            <Link href="/licitaciones">Fichas de procesos</Link>
            {" · "}Comparar departamentos
          </nav>
          <h1 className="lp-cab-h1">Comparar departamentos</h1>
          <p className="lp-cab-desc">
            Elige hasta tres y compara sus procesos abiertos de agua y saneamiento. La dirección de
            esta página guarda tu elección: puedes compartirla.
          </p>
        </header>
        <Comparador departamentos={departamentos} totalAbiertos={total} />
      </div>
    </div>
  );
}
