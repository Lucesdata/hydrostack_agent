import Link from "next/link";
import RadarEntidades from "@/src/components/secop/radar/RadarEntidades";
import { entidadesCompradoras, type Compradores } from "@/src/lib/secop/compradores";
import "@/src/components/secop/radar/radar.css";
export const revalidate = 21600;
export const metadata = {
  title: "Radar institucional · Entidades contratantes",
  description:
    "Fichas institucionales de entidades públicas que contratan proyectos de agua y saneamiento en SECOP II.",
  alternates: { canonical: "/licitaciones/entidades" },
};
export default async function Page() {
  let datos: Compradores | null = null;
  try {
    datos = await entidadesCompradoras();
  } catch (error) {
    console.error("[radar institucional] fuente no disponible", error);
  }
  return (
    <div className="ri-page">
      <header className="ri-hero ri-hero--radar">
        <div className="ri-shell">
          <span className="ri-eyebrow">AQUALICITA · INTELIGENCIA INSTITUCIONAL</span>
          <h1>
            Radar <span style={{ color: "#008c90" }}>institucional</span>
          </h1>
          <p>
            Explora las fichas vivas de alcaldías, empresas de servicios públicos, gobernaciones e
            instituciones que contratan agua y saneamiento en Colombia.
          </p>
        </div>
      </header>
      <div className="ri-shell ri-section">
        <div className="ri-tabs">
          <Link className="ri-tab" href="/proyectos-adjudicados">
            Proyectos adjudicados ↗
          </Link>
          <Link className="ri-tab" href="/licitaciones">
            Fichas de procesos ↗
          </Link>
        </div>
        {datos ? (
          <>
            <p className="ri-muted">
              {datos.totalEntidades.toLocaleString("es-CO")} entidades con procesos abiertos en la
              base · se muestran hasta {datos.entidades.length} · actualización según ingesta de
              SECOP II.
            </p>
            <RadarEntidades datos={datos} />
          </>
        ) : (
          <div className="ri-empty">
            No se pudo conectar con los registros SECOP II. Esta página no muestra cifras simuladas.
          </div>
        )}
        <aside className="ri-criteria">
          <strong>Cómo leer este radar</strong>
          <p>
            El orden inicial usa la cantidad de procesos que reciben ofertas, no el valor
            adjudicado. Las cifras monetarias representan presupuesto oficial de procesos abiertos
            con monto positivo, no contratos adjudicados. La ubicación corresponde a la sede de la
            entidad. Cada ficha institucional reúne historial, adjudicaciones identificadas y
            procesos abiertos.
          </p>
        </aside>
      </div>
    </div>
  );
}
