/**
 * El HTML que sirve el servidor del Radar, antes de JavaScript: la lista de
 * enlaces intacta y el panel con la cabecera del primer proceso. El bloque de
 * decisión no va en ese HTML: se monta en el navegador cuando se sabe que hay
 * ancho, para no pedir el veredicto en un celular que no lo enseña.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RadarVitrina from "@/src/components/secop/vitrina/RadarVitrina";
import type { DetalleRadar } from "@/src/lib/secop/radar";
import type { DatosDecision } from "@/src/components/secop/ficha/BloqueDecision";

function detalle(id: string, titulo: string, urlSecop: string | null): DetalleRadar {
  return {
    id,
    href: `/licitaciones/x--${id}`,
    titulo,
    entidad: "Alcaldía de Riosucio",
    lugar: "Riosucio, Caldas",
    tipoLabel: "Alcantarillado",
    tipoColor: "#5B6776",
    datos: { urlSecop } as DatosDecision,
  };
}

const html = renderToStaticMarkup(
  <RadarVitrina
    detalles={[
      detalle("CO1.REQ.1", "Alcantarillado de San Jerónimo", "https://community.secop.gov.co/1"),
      detalle("CO1.REQ.2", "Planta de Covarachía", null),
    ]}
  >
    <ul>
      <li>
        <a className="fc" data-id="CO1.REQ.1" href="/licitaciones/x--CO1.REQ.1">
          uno
        </a>
      </li>
    </ul>
  </RadarVitrina>
);

describe("Radar — HTML sin JavaScript", () => {
  it("la lista sigue siendo de enlaces a la ficha", () => {
    expect(html).toContain('<a class="fc" data-id="CO1.REQ.1" href="/licitaciones/x--CO1.REQ.1">');
  });

  it("el panel abre con el primer proceso, su enlace a la ficha y al SECOP", () => {
    expect(html).toContain('<aside class="vr-panel" aria-label="Detalle del proceso elegido">');
    expect(html).toContain("Alcantarillado de San Jerónimo");
    expect(html).not.toContain("Planta de Covarachía");
    expect(html).toContain('href="/licitaciones/x--CO1.REQ.1"');
    expect(html).toContain('href="https://community.secop.gov.co/1"');
  });

  it("el bloque de decisión no viaja en el HTML del servidor", () => {
    expect(html).not.toContain('class="fd"');
  });
});
