import Link from "next/link";

export const metadata = {
  title: "Gemelos digitales",
  description:
    "Qué son los gemelos digitales de plantas y sistemas de agua y saneamiento, y para qué sirven al evaluar un proyecto antes de ejecutarlo.",
};

/**
 * Página informativa (2026-11-01): el CTA del hero necesitaba un destino real.
 * Explica el concepto y dice con claridad que AquaLicita aún no ofrece esta
 * herramienta: no hay cifras ni capturas de producto, y las lecturas del hero
 * son demostrativas.
 */
export default function GemelosDigitalesPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px var(--gutter, 20px) 80px" }}>
      <p style={{ fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase" }}>
        Gemelos digitales
      </p>
      <h1>Diseña, simula y optimiza antes de ejecutar</h1>
      <p>
        Un gemelo digital es un modelo de una planta o de un sistema de agua y saneamiento que se
        alimenta con sus datos de diseño y de operación. Permite comparar alternativas, estimar
        costos y ver cómo respondería el sistema —caudal, eficiencia, calidad del agua tratada—
        antes de construirlo o de intervenirlo.
      </p>
      <h2>Para qué sirve al evaluar un proyecto</h2>
      <ul>
        <li>Comparar alternativas de tratamiento o de trazado con los mismos supuestos.</li>
        <li>Anticipar el desempeño y los costos de operación, no solo los de obra.</li>
        <li>Detectar cuellos de botella antes de que lleguen a la ejecución.</li>
      </ul>
      <h2>Estado en AquaLicita</h2>
      <p>
        Esta herramienta todavía no está disponible. Las lecturas que se ven en la portada son una
        ilustración con datos demostrativos, no mediciones de una planta real. Hoy AquaLicita te
        ayuda a encontrar procesos de contratación y a revisar sus requisitos.
      </p>
      <p>
        <Link href="/licitaciones">Explorar oportunidades →</Link>
      </p>
    </main>
  );
}
