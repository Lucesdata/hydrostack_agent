import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RivalesFicha from "@/src/components/secop/ficha/RivalesFicha";

const RIVALES = [
  { proveedorKey: "nit:900", nombre: "AGUAS SAS", presentados: 4, ganados: 2 },
  { proveedorKey: "nom:obras del norte", nombre: null, presentados: 1, ganados: 0 },
];

describe("RivalesFicha (§7 de la ficha)", () => {
  const html = renderToStaticMarkup(
    <RivalesFicha rivales={RIVALES} procesoId="CO1.REQ.1" slug="ptar--CO1.REQ.1" />
  );

  it("cada rival es un desplegable con su fila visible sin abrirlo", () => {
    expect(html.match(/<details/g)).toHaveLength(2);
    expect(html).toContain("AGUAS SAS");
    expect(html).toContain('aria-label="4 presentados"');
    expect(html).toContain('aria-label="2 ganados"');
    expect(html).toContain("Sin nombre");
  });

  it("no enlaza a una página de competidor: el historial se abre aquí", () => {
    expect(html).not.toContain("/competidores");
  });

  it("dice qué es la lista: histórico comparable, no los oferentes de este proceso", () => {
    expect(html).toContain("mismo tipo de proyecto y mismo departamento");
    expect(html).toContain("No son los oferentes de este proceso");
  });
});
