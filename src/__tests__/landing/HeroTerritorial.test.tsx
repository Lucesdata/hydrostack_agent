import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HeroTerritorial from "@/src/components/landing/hero-territorial/HeroTerritorial";
import FichaDepartamento, {
  formatPorcentaje,
  porcentajeNacional,
} from "@/src/components/landing/hero-territorial/FichaDepartamento";

const departamentos = [
  { clave: "05", label: "Antioquia", slug: "antioquia", n: 5155 },
  { clave: "11", label: "Bogotá D.C.", slug: "bogota-d-c", n: 4820 },
];
/** Filas con detalle: solo con él se ofrecen las opciones del mapa. */
const conDetalle = departamentos.map((d) => ({
  ...d,
  montoAbierto: 1e9,
  nConMonto: 10,
  nuevos7d: 3,
  nEntidades: 40,
  tipos: { acueducto: 1, alcantarillado: 1, ptap: 1, ptar: 1, otros: 1 },
}));

describe("HeroTerritorial", () => {
  it("renderiza el mapa una sola vez y usa departamentos reales", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial
        mapa={<div data-testid="mapa-departamental">Mapa</div>}
        departamentos={departamentos}
        totalAbiertos={10000}
      />
    );
    expect(html.match(/data-testid="mapa-departamental"/g)).toHaveLength(1);
    expect(html).toContain("Antioquia");
    expect(html).toContain("Bogotá D.C.");
    expect(html).toContain("5.155");
  });

  it("un solo botón en el mensaje: ni diagnóstico, ni precios, ni alertas (2026-09-27)", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial departamentos={departamentos} totalAbiertos={10000} />
    );
    expect(html).toContain("Ver fichas de procesos");
    expect(html).toContain('href="/licitaciones');
    // Salieron del hero; siguen en el pie y en su página.
    expect(html).not.toContain('href="/diagnostico"');
    expect(html).not.toContain('href="/precios"');
    expect(html).not.toContain("INTELIGENCIA DE CONTRATACIÓN PÚBLICA");
    // Las alertas no se entregan en producción (PENDIENTES §0).
    expect(html.toLowerCase()).not.toContain("alerta");
  });

  it("el resultado lleva a las fichas del departamento, con su número", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial departamentos={departamentos} totalAbiertos={10000} />
    );
    expect(html).toContain('href="/licitaciones/departamento/antioquia"');
    expect(html).toContain("Ver las 5.155 fichas de Antioquia");
    // Fuera de la portada: tipos por departamento, comparar y el tooltip.
    expect(html).not.toContain("Tipos de proyecto ·");
    expect(html).not.toContain("Comparar");
  });

  it("la nota de la sede va en la cabecera del mapa", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial departamentos={departamentos} totalAbiertos={10000} />
    );
    expect(html).toContain("según ubicación de la entidad contratante");
  });

  it("las opciones del mapa van plegadas y solo si hay detalle", () => {
    const sin = renderToStaticMarkup(
      <HeroTerritorial departamentos={departamentos} totalAbiertos={10000} />
    );
    expect(sin).not.toContain("Opciones del mapa");
    const con = renderToStaticMarkup(
      <HeroTerritorial departamentos={conDetalle} totalAbiertos={10000} />
    );
    expect(con).toContain("<summary>Opciones del mapa</summary>");
    expect(con).toContain('<option value="monto">Monto en juego</option>');
    // Los cinco tipos, desde TIPOS_PROYECTO, y «Todos».
    expect(con.match(/<option value="(acueducto|alcantarillado|ptap|ptar|otros)"/g)).toHaveLength(
      5
    );
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

describe("resultado del departamento", () => {
  it("cambia con el departamento seleccionado", () => {
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

  it("solo dice nombre, procesos y porcentaje: lo demás está en /licitaciones/comparar", () => {
    const html = renderToStaticMarkup(
      <FichaDepartamento departamento={conDetalle[0]} totalAbiertos={10000} />
    );
    expect(html).not.toContain("últimos 7 días");
    expect(html).not.toContain("en juego");
    expect(html).not.toContain("entidades contratan");
  });

  it("concuerda el singular", () => {
    const uno = renderToStaticMarkup(
      <FichaDepartamento departamento={{ ...departamentos[0], n: 1 }} totalAbiertos={10000} />
    );
    expect(uno).toContain("proceso abierto");
    expect(uno).not.toContain("procesos abiertos");
  });

  it("la vista previa se marca y no se anuncia", () => {
    const html = renderToStaticMarkup(
      <FichaDepartamento departamento={departamentos[0]} totalAbiertos={10000} vistaPrevia />
    );
    expect(html).toContain("Vista previa");
    expect(html).toContain('aria-live="off"');
  });

  it("solo calcula porcentaje con total nacional positivo", () => {
    expect(porcentajeNacional(10, 100)).toBe(10);
    expect(porcentajeNacional(0, 100)).toBe(0);
    expect(porcentajeNacional(0, 0)).toBeNull();
    expect(porcentajeNacional(10, null)).toBeNull();
  });
});

describe("formatPorcentaje", () => {
  it("no dice 0,0 % cuando hay procesos", () => {
    expect(formatPorcentaje(0.014)).toBe("< 0,1 %");
    expect(formatPorcentaje(0)).toBe("0,0 %");
    expect(formatPorcentaje(14.52)).toBe("14,5 %");
    expect(formatPorcentaje(null)).toBe("—");
  });
});

describe("alternativa en texto al mapa", () => {
  it("la lista de departamentos va plegada bajo el mapa", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial departamentos={departamentos} totalAbiertos={10000} />
    );
    expect(html).toContain('<details class="');
    expect(html).toContain('id="aq-lista-departamentos"');
    expect(html).toContain("Ver los 2 departamentos como lista");
    expect(html).toContain('aria-controls="aq-ficha-territorial"');
    // Un solo buscador en el hero: la lista ya no trae el suyo.
    expect(html).not.toContain("Buscar departamento");
  });

  it("con un departamento no dice «los 1»", () => {
    const html = renderToStaticMarkup(
      <HeroTerritorial departamentos={[departamentos[0]]} totalAbiertos={10000} />
    );
    expect(html).toContain("Ver el departamento como lista");
  });

  it("sin datos no ofrece una lista vacía", () => {
    expect(renderToStaticMarkup(<HeroTerritorial />)).not.toContain("como lista");
  });
});
