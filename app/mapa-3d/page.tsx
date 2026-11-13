import type { Metadata } from "next";
import Link from "next/link";
import Visor from "./Visor";
import s from "./mapa.module.css";

export const metadata: Metadata = {
  title: "Mapa 3D de proyectos adjudicados en Colombia",
  description:
    "Consulta adjudicaciones de agua y saneamiento y su etapa contractual por departamento.",
  alternates: { canonical: "/mapa-3d" },
};

export default function PaginaMapa() {
  return (
    <section className={s.pagina} aria-labelledby="titulo-mapa">
      <header className={s.cabecera}>
        <div>
          <p className={s.rotulo}>Colombia · SECOP II</p>
          <h1 id="titulo-mapa">Mapa de proyectos adjudicados</h1>
          <p>
            Consulta la etapa contractual y los pagos publicados de proyectos de agua y saneamiento.
          </p>
        </div>
        <Link href="/proyectos-adjudicados">Ver adjudicaciones del mes →</Link>
      </header>
      <Visor />
      <p className={s.creditos}>
        Cartografía: DANE, MGN 2025. Islas ampliadas para facilitar la selección.{" "}
        <a href="https://www.geoboundaries.org">geoBoundaries</a> (
        <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>).
      </p>
    </section>
  );
}
