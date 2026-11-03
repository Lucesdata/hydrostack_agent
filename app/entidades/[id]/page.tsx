import { notFound } from "next/navigation";
import Link from "next/link";
import { perfilEntidad } from "@/src/lib/secop/radar-institucional";
import { formatCopEscala } from "@/src/components/secop/format";
import { slugDeProceso } from "@/src/lib/secop/slug";
import "@/src/components/secop/radar/radar.css";
export const revalidate = 21600;
const tipos: Record<string, string> = {
  acueducto: "Acueducto",
  alcantarillado: "Alcantarillado",
  ptap: "PTAP",
  ptar: "PTAR",
  otros: "Otros",
};
export async function generateStaticParams() {
  return [];
}
export async function generateMetadata({ params }: { params: { id: string } }) {
  const e = await perfilEntidad(params.id).catch(() => null);
  return {
    title: e ? `${e.nombre} · Ficha institucional` : "Entidad no encontrada",
    robots: e ? undefined : { index: false },
  };
}
export default async function Page({ params }: { params: { id: string } }) {
  let e: Awaited<ReturnType<typeof perfilEntidad>> | null = null;
  try {
    e = await perfilEntidad(params.id);
  } catch (error) {
    console.error("[entidad] fuente no disponible", error);
  }
  if (!e) notFound();
  const fecha = (s: string | null) =>
    s
      ? new Intl.DateTimeFormat("es-CO", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(s + "T12:00:00Z"))
      : "Sin fecha";
  return (
    <div className="ri-page">
      <header className="ri-hero">
        <div className="ri-shell">
          <Link className="ri-link" href="/licitaciones/entidades">
            ← Radar institucional
          </Link>
          <p className="ri-eyebrow" style={{ marginTop: 22 }}>
            FICHA VIVA INSTITUCIONAL · SECOP II
          </p>
          <h1>{e.nombre}</h1>
          <p>
            {e.municipio || "Municipio por verificar"} ·{" "}
            {e.departamento || "Departamento por verificar"} · NIT {e.nit || "no publicado"}
          </p>
          <div className="ri-tabs">
            <Link
              className="ri-button"
              href={`/licitaciones?q=${encodeURIComponent(e.nombre || "")}`}
            >
              Explorar sus procesos →
            </Link>
            <Link className="ri-button ri-button--outline" href="/proyectos-adjudicados">
              Mayores adjudicaciones
            </Link>
          </div>
        </div>
      </header>
      <div className="ri-shell ri-section">
        <div className="ri-stats">
          <div className="ri-stat">
            <strong>{e.resumen.n.toLocaleString("es-CO")}</strong>
            <span>Procesos registrados en la base</span>
          </div>
          <div className="ri-stat">
            <strong>{e.resumen.adjudicados.toLocaleString("es-CO")}</strong>
            <span>Marcados como adjudicados</span>
          </div>
          <div className="ri-stat">
            <strong>
              {e.resumen.valorAdjudicado > 0 ? formatCopEscala(e.resumen.valorAdjudicado) : "—"}
            </strong>
            <span>Valor adjudicado conocido · histórico disponible</span>
          </div>
        </div>
        <div className="ri-layout" style={{ marginTop: 28 }}>
          <section className="ri-card">
            <h2 className="ri-title">Procesos que reciben ofertas</h2>
            <p className="ri-muted">
              Hasta diez procesos abiertos, con plazo de recepción vigente.
            </p>
            {e.abiertos.length === 0 ? (
              <p className="ri-empty">No se identifican procesos recibiendo ofertas actualmente.</p>
            ) : (
              e.abiertos.map((p) => (
                <div className="ri-process ri-process--2" key={p.id}>
                  <div>
                    <span className="ri-chip">{tipos[p.tipo ?? ""] ?? "Agua y saneamiento"}</span>
                    <h3>{p.objeto || p.secopId}</h3>
                    <p>Cierre: {fecha(p.fecha)}</p>
                    <Link
                      className="ri-link"
                      href={`/licitaciones/${slugDeProceso(p.objeto, p.secopId)}`}
                    >
                      Ver proceso →
                    </Link>
                  </div>
                  <strong>{p.valor ? formatCopEscala(p.valor) : "—"}</strong>
                </div>
              ))
            )}
          </section>
          <section className="ri-card">
            <h2 className="ri-title">Adjudicaciones recientes</h2>
            <p className="ri-muted">
              Hasta diez procesos marcados como adjudicados; fecha publicada en SECOP II.
            </p>
            {e.recientes.length === 0 ? (
              <p className="ri-empty">
                Sin adjudicaciones identificadas en el histórico disponible.
              </p>
            ) : (
              e.recientes.map((p) => (
                <div className="ri-process ri-process--2" key={p.id}>
                  <div>
                    <span className="ri-chip">{tipos[p.tipo ?? ""] ?? "Agua y saneamiento"}</span>
                    <h3>{p.objeto || p.secopId}</h3>
                    <p>
                      {fecha(p.fecha)} · Adjudicatario: {p.adjudicatario || "No identificado"}
                    </p>
                    <Link
                      className="ri-link"
                      href={`/licitaciones/${slugDeProceso(p.objeto, p.secopId)}`}
                    >
                      Ver ficha →
                    </Link>
                  </div>
                  <strong>{p.valor ? formatCopEscala(p.valor) : "—"}</strong>
                </div>
              ))
            )}
          </section>
        </div>
        <aside className="ri-criteria">
          <strong>Origen y alcance</strong>
          <p>
            Los registros proceden de la base de AquaLicita alimentada con SECOP II. Los totales
            representan la cobertura histórica disponible, no necesariamente toda la contratación de
            la entidad. La sede administrativa puede ser diferente del lugar de obra. El valor
            adjudicado no representa pagos ni avance físico. No se han añadido logotipos oficiales
            sin licencia ni verificación.
          </p>
        </aside>
      </div>
    </div>
  );
}
