import Link from "next/link";
import { comercialHabilitado } from "@/src/lib/comercial/habilitado";

export const metadata = {
  title: "Inteligencia Comercial | AquaLicita",
  description:
    "Exploración de oportunidades para empresas proveedoras de tecnología, equipos y servicios de agua y saneamiento en Colombia.",
};

/**
 * Página pública explicativa. El explorador privado conserva su bandera
 * CI_COMERCIAL_HABILITADO y sus controles existentes.
 */
export default function InteligenciaComercial() {
  const habilitado = comercialHabilitado();

  return (
    <main
      style={{
        maxWidth: 820,
        margin: "0 auto",
        padding: "clamp(36px, 5vw, 72px) 20px 100px",
      }}
    >
      <p style={{ letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 12 }}>
        AquaLicita · Inteligencia Comercial
      </p>
      <h1>Encuentra proyectos donde tu empresa puede aportar soluciones</h1>
      <p>
        Identifica procesos relacionados con agua potable, saneamiento, redes y plantas de
        tratamiento. Explora oportunidades asociadas con tecnología, equipos y servicios
        industriales usando la información de contratación disponible.
      </p>
      <h2>Qué puedes consultar</h2>
      <ul>
        <li>Procesos públicos y fichas de contratación en SECOP II.</li>
        <li>Proyectos adjudicados y actividad de entidades del sector.</li>
        <li>Un explorador comercial por tecnología, cuando esté habilitado.</li>
      </ul>
      <p>
        {habilitado
          ? "El explorador comercial está habilitado en este entorno."
          : "El explorador comercial especializado está en preparación para su apertura pública. Puedes consultar ahora los procesos publicados."}
      </p>
      <p>
        <Link href={habilitado ? "/comercial/explorar" : "/licitaciones"}>
          {habilitado ? "Abrir explorador comercial →" : "Explorar procesos de contratación →"}
        </Link>
      </p>
    </main>
  );
}
