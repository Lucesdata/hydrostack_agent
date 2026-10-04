import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ColombiaChoropleth, {
  familiasPorDepartamento,
} from "@/src/components/mapa/ColombiaChoropleth";
import { procesoPortada } from "../landing/fixtures-portada";

/**
 * El mapa del hero en modo selección: lo que pone en el HTML. Se renderiza de
 * verdad, porque lo que puede romperse es justo la correspondencia con las
 * tarjetas (ids, rutas, presupuestos) y lo que el mapa deja de hacer (contar,
 * enlazar facetas).
 */

const cinco = [
  procesoPortada({ id: "CO1.REQ.1", departamentoCodigo: "76", departamento: "Valle del Cauca" }),
  procesoPortada({
    id: "CO1.REQ.2",
    departamentoCodigo: "52",
    departamento: "Nariño",
    tipoProyecto: "ptar",
    presupuesto: 980_000_000,
  }),
  procesoPortada({
    id: "CO1.REQ.3",
    departamentoCodigo: "11",
    departamento: "Bogotá D.C.",
    municipio: null,
    tipoProyecto: "alcantarillado",
    presupuesto: null,
  }),
  procesoPortada({
    id: "CO1.REQ.4",
    departamentoCodigo: "76",
    departamento: "Valle del Cauca",
    tipoProyecto: "ptar",
  }),
  procesoPortada({
    id: "CO1.REQ.5",
    departamentoCodigo: "88",
    departamento: "Archipiélago de San Andrés, Providencia y Santa Catalina",
    tipoProyecto: null,
  }),
];

const html = renderToStaticMarkup(<ColombiaChoropleth filas={[]} seleccion={cinco} />);

describe("ColombiaChoropleth en modo selección", () => {
  it("una etiqueta por proceso, enlazada a SU ficha, con nombre accesible distinguible", () => {
    for (const p of cinco) {
      expect(html).toContain(`href="${p.href}"`);
      expect(html).toContain(`aria-label="Ver ficha del proceso ${p.numeroProceso}: ${p.objeto}"`);
    }
    expect(html.match(/class="clr-mapa__etq"/g)).toHaveLength(5);
  });

  it("la etiqueta dice departamento y presupuesto abreviado; sin presupuesto, lo dice", () => {
    expect(html).toContain(">Valle del Cauca<");
    expect(html).toContain(">$980 M<");
    expect(html).toContain(">Sin presupuesto<");
    expect(html).toContain(">San Andrés<");
    // Ni letras ni ordinales ni el número de proceso como rótulo permanente.
    expect(html).not.toMatch(/>[A-E]<\/text>/);
    expect(html).not.toContain(">REF-CO1.REQ.1<");
  });

  it("varios procesos en un departamento comparten un anclaje, que es neutro si mezclan familias", () => {
    expect(html).toContain(
      'data-ancla="76" data-procesos="CO1.REQ.1 CO1.REQ.4" data-familia="mixta"'
    );
    expect(html.match(/class="clr-mapa__ancla"/g)).toHaveLength(4);
    expect(html).toMatch(/data-dpto="76" data-familia="mixta"/);
    expect(html).toMatch(/data-dpto="52" data-familia="residual"/);
  });

  it("deja de ser coroplético: sin escala de conteos, sin facetas, sin conteos en los nombres", () => {
    expect(html).not.toContain("clr-mapa__leyenda");
    expect(html).not.toContain("/licitaciones/departamento/");
    expect(html).not.toContain("procesos abiertos");
    expect(html).not.toContain("clr-mapa__dpto--e");
  });

  it("el SVG tiene nombre y descripción, y dice qué significa la ubicación", () => {
    expect(html).toContain('aria-label="Mapa de Colombia con los procesos para explorar"');
    // Sin <title> en el SVG: salía como cartel al pasar el cursor.
    expect(html).not.toContain('id="clr-mapa-titulo"');
    expect(html).toContain('aria-describedby="clr-mapa-desc"');
    expect(html).toContain("5 procesos marcados en el departamento de su entidad contratante");
  });

  it("sin procesos, el mapa base sin señales", () => {
    const vacio = renderToStaticMarkup(<ColombiaChoropleth filas={[]} seleccion={[]} />);
    expect(vacio).not.toContain("clr-mapa__etq");
    expect(vacio).not.toContain("clr-mapa__ancla");
    expect(vacio.match(/clr-mapa__dpto--base/g)!.length).toBe(33);
  });
});

describe("familiasPorDepartamento", () => {
  it("una familia si todos coinciden, «mixta» si no", () => {
    const f = familiasPorDepartamento(cinco);
    expect(f.get("76")).toBe("mixta");
    expect(f.get("52")).toBe("residual");
    expect(f.get("11")).toBe("redes");
    expect(f.get("88")).toBe("otros");
  });
});
