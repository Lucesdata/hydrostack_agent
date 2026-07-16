// src/components/secop/ComoParticipar.tsx

/**
 * Página educativa "Cómo participar en una licitación" — Fase 3 (pulido).
 * Prosa, tono del agente (directo, ejemplos concretos, avisos de error común).
 * Server component: sin estado, enlaza al workbench para buscar y ver
 * elegibilidad.
 *
 * Spec: docs/superpowers/specs/2026-07-15-vista-simple-y-elegibilidad-diferida.md
 */

import Link from "next/link";
import TrackedCtaLink from "./TrackedCtaLink";

export default function ComoParticipar() {
  return (
    <div className="clr-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="clr-container clr-cp-container">
        <header className="clr-cp-header">
          <span className="clr-tag">Guía · Contratación pública</span>
          <h1 className="clr-h1">Cómo participar en una licitación pública</h1>
          <p className="clr-sub">
            Una guía práctica para empresas y personas naturales que quieren
            ofertar en procesos de contratación del sector agua potable y
            saneamiento básico en Colombia.
          </p>
        </header>

        <section className="clr-cp-section">
          <p>
            "Participar" en un proceso de SECOP II significa presentar una
            oferta formal antes de que cierre el plazo, cumpliendo los
            requisitos que la entidad pidió en el pliego de condiciones. Puedes
            hacerlo como empresa (persona jurídica) o como persona natural —
            los requisitos cambian según el tipo de contrato y su cuantía, pero
            el camino general es el mismo.
          </p>
        </section>

        <section className="clr-cp-section">
          <h2 className="clr-cp-h2">1. Revisa si puedes ofertar</h2>
          <p>
            Para obras, consultoría e interventoría necesitas estar inscrito en
            el <strong>RUP</strong> (Registro Único de Proponentes) de tu
            Cámara de Comercio, con la experiencia y capacidad financiera que
            el pliego exige. Para contratos de prestación de servicios o de
            mínima cuantía, muchas entidades no exigen RUP — basta con tus
            documentos de identidad o de constitución de la empresa.
          </p>
          <p>
            <strong>Paso concreto:</strong> si nunca has ofertado, empieza por
            confirmar tu inscripción en el RUP (o inscribirte si trabajas en
            obra o consultoría) antes de buscar procesos. Sin eso, no vas a
            poder presentar oferta cuando encuentres uno que te sirva.
          </p>
        </section>

        <section className="clr-cp-section">
          <h2 className="clr-cp-h2">2. Encuentra procesos que te sirvan</h2>
          <p>
            No todos los procesos publicados aplican para ti — importa el
            sector, la ubicación y el rango de valor del contrato. En{" "}
            <Link href="/licitaciones/explorar">Búsqueda avanzada</Link> puedes
            filtrar los procesos de agua y saneamiento por departamento, estado
            y valor, y cuando cuentas quién eres (sectores en los que trabajas,
            dónde puedes operar, qué rango de cuantía te interesa) te decimos
            en cuáles procesos tienes más chance antes de que inviertas tiempo
            leyendo el pliego completo.
          </p>
        </section>

        <section className="clr-cp-section">
          <h2 className="clr-cp-h2">3. Lee el pliego de condiciones completo</h2>
          <p>
            El pliego (o "documento del proceso") vive en SECOP II, en el
            detalle del proceso. Ahí están los requisitos habilitantes
            exactos, el cronograma (fecha de cierre, plazo para aclaraciones,
            posibles adendas que modifican las reglas), las garantías que vas
            a tener que constituir y los criterios con los que van a evaluar
            tu oferta frente a las demás.
          </p>
          <p className="clr-cp-warn">
            <strong>Error común:</strong> presentar la oferta a última hora sin
            margen para imprevistos. SECOP II no acepta nada después del cierre
            exacto, ni por unos minutos — no hay excepción por falla técnica de
            tu lado.
          </p>
        </section>

        <section className="clr-cp-section">
          <h2 className="clr-cp-h2">4. Prepara y presenta tu oferta</h2>
          <p>
            Una oferta completa suele llevar tres bloques de documentos:
            jurídicos (RUP vigente, certificado de existencia y representación
            si eres empresa, o cédula si eres persona natural), técnicos
            (experiencia específica y propuesta técnica) y económicos
            (propuesta de precio y garantía de seriedad de la oferta). Todo se
            sube a través de la plataforma SECOP II, dentro del plazo que fijó
            el cronograma.
          </p>
        </section>

        <section className="clr-cp-section">
          <h2 className="clr-cp-h2">5. Qué pasa después de presentar</h2>
          <p>
            La entidad evalúa las ofertas contra los criterios del pliego. Si
            te piden subsanar (completar un documento faltante o corregir
            algo menor), responde dentro del plazo que te den — no hacerlo a
            tiempo puede sacarte del proceso aunque tu oferta fuera la mejor.
            Si resultas adjudicado, sigue la firma del contrato y las
            garantías de cumplimiento.
          </p>
        </section>

        <aside className="clr-cp-cta">
          <p>
            <strong>¿Listo para buscar un proceso?</strong> En la búsqueda
            avanzada puedes filtrar por sector agua y saneamiento y, cuando
            quieras, contarnos de ti para ver tu elegibilidad en cada uno.
          </p>
          <TrackedCtaLink
            href="/licitaciones/explorar"
            event="como_participar_cta_buscar"
            className="clr-cp-cta-link"
          >
            Buscar procesos →
          </TrackedCtaLink>
        </aside>
      </div>
    </div>
  );
}

const CSS = `
.clr-cp-container{ max-width: 720px; }
.clr-cp-header{ margin-bottom: 24px; }
.clr-cp-section{ margin-bottom: 22px; }
.clr-cp-section p{
  font-size: 14px; color: var(--ink-700, var(--ink-900));
  line-height: 1.7; margin: 0 0 10px;
}
.clr-cp-section p:last-child{ margin-bottom: 0; }
.clr-cp-section a{ color: var(--accent); text-decoration: underline; }
.clr-cp-h2{
  font-size: 16px; font-weight: 600; color: var(--ink-900);
  margin: 0 0 10px;
}
.clr-cp-warn{
  border-left: 2px solid var(--warning);
  padding: 8px 14px;
  background: rgba(217,119,6,0.06);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}
.clr-cp-cta{
  margin-top: 28px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  display: flex; justify-content: space-between; align-items: center;
  gap: 16px; flex-wrap: wrap;
  background: var(--accent-faint, rgba(0,0,0,0.02));
}
.clr-cp-cta p{ margin: 0; font-size: 12.5px; color: var(--ink-600); line-height: 1.55; max-width: 52ch; }
.clr-cp-cta strong{ color: var(--ink-900); font-weight: 600; }
.clr-cp-cta-link{
  font-size: 12.5px; font-weight: 500; color: #fff; text-decoration: none;
  background: var(--accent); padding: 8px 16px; border-radius: var(--radius-md);
  white-space: nowrap; transition: opacity 0.15s;
}
.clr-cp-cta-link:hover{ opacity: 0.88; }
`;
