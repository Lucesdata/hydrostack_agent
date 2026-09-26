import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ListaCompradores from "@/src/components/secop/compradores/ListaCompradores";

const epm = {
  id: "e1",
  nombre: "EMPRESAS PUBLICAS DE MEDELLIN E.S.P.",
  departamento: "ANTIOQUIA",
  clase: "esp" as const,
  n: 412,
  montoAbierto: 812_000_000_000,
  nConMonto: 390,
};

describe("ListaCompradores", () => {
  it("sin base dice que no está disponible; sin abiertos, que no hay", () => {
    expect(renderToStaticMarkup(<ListaCompradores datos={null} />)).toContain("no está disponible");
    expect(
      renderToStaticMarkup(<ListaCompradores datos={{ entidades: [], totalEntidades: 0 }} />)
    ).toContain("Ninguna entidad");
  });

  it("cada fila: nombre legible, clase enlazada a su faceta, sede, cifras y sus procesos", () => {
    const html = renderToStaticMarkup(
      <ListaCompradores datos={{ entidades: [epm], totalEntidades: 1 }} />
    );
    expect(html).toContain("Empresas Publicas de Medellin E.S.P.");
    expect(html).toContain('href="/licitaciones/entidad/esp"');
    expect(html).toContain("Antioquia");
    expect(html).toContain("412");
    expect(html).toContain("390 de 412 con presupuesto");
    expect(html).toContain(
      `href="/licitaciones/explorar?q=${encodeURIComponent(epm.nombre).replace(/&/g, "&amp;")}"`
    );
  });

  it("sin presupuesto publicado muestra — y sin sede lo dice", () => {
    const html = renderToStaticMarkup(
      <ListaCompradores
        datos={{
          entidades: [{ ...epm, departamento: null, montoAbierto: 0, nConMonto: 0 }],
          totalEntidades: 1,
        }}
      />
    );
    expect(html).toContain("<strong>—</strong>");
    expect(html).toContain("Sede sin resolver");
  });
});
