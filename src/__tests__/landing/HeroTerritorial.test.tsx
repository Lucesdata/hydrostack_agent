import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HeroTerritorial from "@/src/components/landing/hero-territorial/HeroTerritorial";
import FichaDepartamento, {
  porcentajeNacional,
} from "@/src/components/landing/hero-territorial/FichaDepartamento";
import { filtrarTerritorios } from "@/src/components/landing/hero-territorial/ListaTerritorios";

const departamentos = [
  { clave: "05", label: "Antioquia", slug: "antioquia", n: 5155 },
  { clave: "11", label: "Bogotá D.C.", slug: "bogota-d-c", n: 4820 },
];
const tipos = [{ clave: "ptar", label: "PTAR", slug: "ptar", n: 150 }];

describe("HeroTerritorial", () => {
  it("renderiza el mapa una sola vez y usa departamentos reales", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial
        mapa={<div data-testid="mapa-departamental">Mapa</div>}
        departamentos={departamentos}
        tipos={tipos}
        totalAbiertos={10000}
      />
    );
    expect(html.match(/data-testid="mapa-departamental"/g)).toHaveLength(1);
    expect(html).toContain("Antioquia");
    expect(html).toContain("Bogotá D.C.");
    expect(html).toContain("5.155");
  });

  it("etiqueta los tipos como nacionales y conserva el CTA territorial", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial departamentos={departamentos} tipos={tipos} totalAbiertos={10000} />
    );
    expect(html).toContain("Tipos de proyecto · Colombia");
    expect(html).toContain('href="/licitaciones/departamento/antioquia"');
    expect(html).toContain("Ver procesos de Antioquia");
    expect(html).toContain('href="/licitaciones"');
  });

  it("elimina el CTA secundario del diagnóstico del hero", () => {
    const html = renderToStaticMarkup(<HeroTerritorial totalAbiertos={0} />);
    expect(html).not.toContain("o mira antes si estás listo");
  });

  it("distingue cero real de dato no disponible", () => {
    const cero = renderToStaticMarkup(<HeroTerritorial totalAbiertos={0} />);
    const sinDato = renderToStaticMarkup(<HeroTerritorial />);
    expect(cero).toContain(">0<");
    expect(cero).not.toContain("El mapa no tiene datos disponibles");
    expect(sinDato).toContain("—");
  });

  it("no contiene cifras demo", () => {
    const html = renderToStaticMarkup(<HeroTerritorial totalAbiertos={0} />);
    expect(html).not.toContain("35.000");
    expect(html).not.toContain("5.155");
    expect(html).not.toContain("14,6 %");
  });
});

describe("interacción territorial pura", () => {
  it("filtra por búsqueda ignorando tildes y conserva el orden", () => {
    expect(filtrarTerritorios(departamentos, "bogota").map((d) => d.clave)).toEqual(["11"]);
    expect(filtrarTerritorios(departamentos, "").map((d) => d.clave)).toEqual(["05", "11"]);
  });

  it("devuelve vacío cuando la búsqueda no tiene resultados", () => {
    expect(filtrarTerritorios(departamentos, "choco")).toEqual([]);
  });

  it("la ficha cambia con el departamento seleccionado", () => {
    const antioquia = renderToStaticMarkup(
      <FichaDepartamento departamento={departamentos[0]} totalAbiertos={10000} />
    );
    const bogota = renderToStaticMarkup(
      <FichaDepartamento departamento={departamentos[1]} totalAbiertos={10000} />
    );
    expect(antioquia).toContain("Antioquia");
    expect(antioquia).toContain("51,6 % del total nacional");
    expect(bogota).toContain("Bogotá D.C.");
    expect(bogota).toContain("48,2 % del total nacional");
  });

  it("solo calcula porcentaje con total nacional positivo", () => {
    expect(porcentajeNacional(10, 100)).toBe(10);
    expect(porcentajeNacional(0, 100)).toBe(0);
    expect(porcentajeNacional(0, 0)).toBeNull();
    expect(porcentajeNacional(10, null)).toBeNull();
  });
});
