import Vitrina from "@/src/components/secop/vitrina/Vitrina";
import { procesosDeVitrina } from "@/src/lib/secop/vitrina";

export const metadata = {
  title: "Fichas de procesos · agua y saneamiento en SECOP II",
  description:
    "Fichas claras de los procesos de agua y saneamiento publicados en SECOP II: cuantía, zona, plazo y quién puede participar.",
};

/**
 * 6 h, la misma cadencia que las facetas. No es el coste lo que manda sino la
 * ingesta: corre una vez al día y las altas llegan a saltos, así que revalidar
 * más a menudo regenera un dato que no ha cambiado.
 */
export const revalidate = 21600;

export default async function LicitacionesPage() {
  return <Vitrina pagina={await procesosDeVitrina("abiertos", 1)} />;
}
