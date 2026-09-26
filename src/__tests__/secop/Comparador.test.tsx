import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Comparador from "@/src/components/secop/comparador/Comparador";

const fila = (clave: string, label: string, n: number) => ({
  clave,
  label,
  slug: label.toLowerCase(),
  n,
  nuevos7d: 12,
  montoAbierto: 5e11,
  nConMonto: Math.floor(n / 2),
  nEntidades: 40,
  tipos: { acueducto: 10, alcantarillado: 5, ptap: 2, ptar: 3, otros: 1 },
});
const departamentos = [
  fila("08", "Atlántico", 900),
  fila("05", "Antioquia", 5155),
  fila("11", "Bogotá D.C.", 3100),
];

describe("Comparador", () => {
  const html = renderToStaticMarkup(
    <Comparador departamentos={departamentos} totalAbiertos={20000} />
  );

  it("arranca con los dos de más procesos, igual en servidor y cliente", () => {
    expect(html).toContain('<th scope="col">Antioquia</th>');
    expect(html).toContain('<th scope="col">Bogotá D.C.</th>');
    expect(html).not.toContain('<th scope="col">Atlántico</th>');
  });

  it("es una tabla con encabezados de fila y las cifras de la ficha", () => {
    expect(html).toContain('<th scope="row">Procesos abiertos</th>');
    expect(html).toContain("25,8 %");
    expect(html).toContain("2.577 de 5.155 con presupuesto");
    expect(html).toContain('<th scope="row">Entidades que contratan</th>');
    expect(html).toContain('href="/licitaciones/departamento/antioquia"');
  });

  it("los tipos van con su nombre, no solo con su color", () => {
    for (const nombre of ["Acueducto", "Alcantarillado", "PTAP", "PTAR", "Otros"]) {
      expect(html).toContain(nombre);
    }
  });

  it("sin datos lo dice, sin cifras inventadas", () => {
    expect(renderToStaticMarkup(<Comparador departamentos={[]} />)).toContain(
      "no están disponibles"
    );
  });
});

describe("estilos del comparador", () => {
  it("son texto, no una referencia de un módulo de cliente", async () => {
    // Exportados desde Comparador.jsx ("use client"), la página de servidor
    // recibía una referencia y la hoja llegaba vacía.
    const { ESTILOS_COMPARADOR } = await import("@/src/components/secop/comparador/estilos");
    expect(typeof ESTILOS_COMPARADOR).toBe("string");
    expect(ESTILOS_COMPARADOR).toContain(".cmp-selectores");
  });
});
