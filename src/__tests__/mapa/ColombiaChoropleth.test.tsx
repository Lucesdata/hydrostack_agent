import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ColombiaChoropleth, { ROTULOS } from "@/src/components/mapa/ColombiaChoropleth";
import geo from "@/data/geo/departamentos.geo.json";
import { ANCHO_MAPA, ALTO_MAPA } from "@/src/lib/mapa/modelo";
import type { FilaAgregado } from "@/src/lib/secop/agregados";

/**
 * Lo que el mapa pone en el HTML.
 *
 * Se renderiza de verdad, no se inspecciona el modelo: lo que aquí puede
 * romperse es justo lo que el modelo no ve —que un departamento sin procesos
 * siga siendo un enlace, que el lector de pantalla no tenga qué leer, que la
 * leyenda se quede sin escalones—.
 */

const filas: FilaAgregado[] = [
  { clave: "05", label: "Antioquia", slug: "antioquia", n: 5155 },
  { clave: "88", label: "Archipiélago de San Andrés", slug: "archipielago", n: 81 },
];

const html = renderToStaticMarkup(<ColombiaChoropleth filas={filas} totalAbiertos={35518} />);

describe("ColombiaChoropleth", () => {
  it("cada rótulo pertenece a la geometría y su caja cabe en el viewBox", () => {
    const codigos = new Set(geo.features.map((f) => f.properties.dpto));
    for (const [codigo, [x, y, anclaX, anclaY]] of Object.entries(ROTULOS)) {
      expect(codigos.has(codigo), `código ${codigo} ausente en geometría`).toBe(true);
      expect(x - 44).toBeGreaterThanOrEqual(0);
      expect(x + 44).toBeLessThanOrEqual(ANCHO_MAPA);
      expect(y - 17).toBeGreaterThanOrEqual(0);
      expect(y + 19).toBeLessThanOrEqual(ALTO_MAPA);
      expect(anclaX).toBeGreaterThanOrEqual(0);
      expect(anclaX).toBeLessThanOrEqual(ANCHO_MAPA);
      expect(anclaY).toBeGreaterThanOrEqual(0);
      expect(anclaY).toBeLessThanOrEqual(ALTO_MAPA);
    }
  });

  it("la falta de datos no se anuncia como ausencia de procesos", () => {
    const vacio = renderToStaticMarkup(
      <ColombiaChoropleth filas={[]} datosDisponibles={false} etiquetas />
    );
    expect(vacio).toContain("Antioquia, datos no disponibles");
    expect(vacio).not.toContain("sin procesos abiertos");
    expect(vacio).not.toContain("Sin procesos</li>");
    expect(vacio).not.toContain('class="atlas-map-label"');
  });

  it("dibuja los 33 departamentos: 32 en el mapa y San Andrés en su recuadro", () => {
    expect(html.match(/<path/g)).toHaveLength(33);
  });

  // Cero real: la base respondió y no hay procesos abiertos. Con el total en 0
  // el cálculo de "sin ubicación" sí se ejecuta, y no debe pintar "0 procesos".
  it("sigue dibujando los 33 departamentos cuando la base responde con cero", () => {
    const html = renderToStaticMarkup(<ColombiaChoropleth filas={[]} totalAbiertos={0} />);

    expect(html.match(/class="clr-mapa__dpto/g)).toHaveLength(33);
    expect(html).not.toContain("sin ubicación resuelta");
    expect(html).not.toContain('class="clr-mapa__link"');
  });

  it("hace clicable el departamento con procesos, hacia su faceta", () => {
    expect(html).toContain('href="/licitaciones/departamento/antioquia"');
  });

  it("le dice al lector de pantalla el nombre y la cifra", () => {
    expect(html).toContain("Antioquia, 5.155 procesos abiertos");
  });

  it("concuerda el singular: Vichada tiene un proceso, no '1 procesos'", () => {
    const uno = renderToStaticMarkup(
      <ColombiaChoropleth filas={[{ clave: "99", label: "Vichada", slug: "vichada", n: 1 }]} />
    );
    expect(uno).toContain("Vichada, 1 proceso abierto");
    expect(uno).not.toContain("1 procesos abiertos");
  });

  it("no convierte en enlace un departamento sin procesos", () => {
    // Vichada no viene en las filas: sale gris y sin enlace.
    expect(html).not.toContain("/licitaciones/departamento/vichada");
  });

  it("pinta la leyenda con los cinco escalones", () => {
    for (const etiqueta of ["Sin procesos", "1–99", "100–499", "500–1.499", "1.500+"]) {
      expect(html).toContain(etiqueta);
    }
  });

  it("dice qué se está viendo, que no es una nota al pie", () => {
    expect(html).toContain("Según ubicación de la entidad contratante");
  });

  it("enuncia fuera del mapa los procesos sin ubicación, en vez de repartirlos", () => {
    // 35.518 abiertos - 5.236 localizados en estas filas = 30.282
    expect(html).toContain("30.282");
  });

  it("omite la línea de sin ubicación cuando no se le da el total", () => {
    const solo = renderToStaticMarkup(<ColombiaChoropleth filas={filas} />);
    expect(solo).not.toContain("sin ubicación");
  });
});
