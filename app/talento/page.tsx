import Link from "next/link";

export const metadata = {
  title: "Talent Intelligence | AquaLicita",
  description:
    "Cómo AquaLicita identifica los requisitos de personal profesional y técnico documentados en pliegos de contratación de agua y saneamiento.",
};

/**
 * Página pública informativa. No consume ni presenta extracciones no verificadas
 * como requisitos oficiales, ni publica vacantes o datos de aspirantes.
 */
export default function TalentIntelligence() {
  return (
    <main
      style={{
        maxWidth: 820,
        margin: "0 auto",
        padding: "clamp(36px, 5vw, 72px) 20px 100px",
      }}
    >
      <p style={{ letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 12 }}>
        AquaLicita · Talent Intelligence
      </p>
      <h1>El equipo profesional detrás de cada proyecto</h1>
      <p>
        Los pliegos de agua potable, saneamiento y redes pueden exigir ingenieros, especialistas,
        técnicos y equipos de apoyo. Talent Intelligence está diseñado para identificar esos
        requisitos, localizar su fuente y facilitar su revisión documental.
      </p>
      <h2>Información que buscamos estructurar</h2>
      <ul>
        <li>Profesiones y especialidades requeridas por los documentos.</li>
        <li>Experiencia general o específica, dedicación y cantidad de profesionales.</li>
        <li>Referencia al documento, sección y página de origen.</li>
      </ul>
      <h2>Estado del servicio</h2>
      <p>
        La extracción y las pruebas internas están implementadas. La verificación de los documentos
        originales y la integración de resultados en la Ficha Viva siguen en curso. Esta página no
        presenta vacantes laborales ni requisitos confirmados para procesos individuales.
      </p>
      <p>
        <Link href="/licitaciones">Consultar fichas de procesos →</Link>
      </p>
    </main>
  );
}
