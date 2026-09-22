import { describe, it, expect } from "vitest";
import { construirModeloMapa } from "@/src/lib/mapa/modelo";
import type { FilaAgregado } from "@/src/lib/secop/agregados";

/**
 * El modelo de vista del mapa: geometría + conteos → lo que el SVG pinta.
 *
 * Es puro y va aparte del componente a propósito. Lo que decide si Antioquia
 * sale coloreada o no es aritmética de códigos, no JSX, y se comprueba más
 * barato aquí que rascando HTML.
 */

const fila = (clave: string, label: string, slug: string, n: number): FilaAgregado => ({
  clave,
  label,
  slug,
  n,
});

describe("modelo del mapa", () => {
  it("devuelve los 33 departamentos aunque falten filas", () => {
    const m = construirModeloMapa([fila("05", "Antioquia", "antioquia", 5155)]);
    expect(m.continente).toHaveLength(32);
    expect(m.sanAndres).not.toBeNull();
    const conDatos = [...m.continente, m.sanAndres!].filter((e) => e.n > 0);
    expect(conDatos).toHaveLength(1);
  });

  it("separa San Andrés del continente: se dibuja en su propio recuadro", () => {
    const m = construirModeloMapa([]);
    expect(m.sanAndres?.dpto).toBe("88");
    expect(m.continente.map((e) => e.dpto)).not.toContain("88");
  });

  it("enlaza con el slug de la base, no con el nombre del archivo", () => {
    // El GeoJSON trae "VALLE DEL CAUCA" en mayúsculas y sin tildes resueltas;
    // la ruta indexada es la que ya existe.
    const m = construirModeloMapa([fila("76", "Valle del Cauca", "valle-del-cauca", 2346)]);
    const valle = m.continente.find((e) => e.dpto === "76");
    expect(valle?.href).toBe("/licitaciones/departamento/valle-del-cauca");
    expect(valle?.nombre).toBe("Valle del Cauca");
  });

  it("no enlaza un departamento sin procesos", () => {
    const m = construirModeloMapa([]);
    const alguno = m.continente[0];
    expect(alguno.n).toBe(0);
    expect(alguno.href).toBeNull();
  });

  it("asigna a cada departamento el escalón de su conteo", () => {
    const m = construirModeloMapa([
      fila("05", "Antioquia", "antioquia", 5155),
      fila("27", "Chocó", "choco", 26),
      fila("23", "Córdoba", "cordoba", 224),
    ]);
    const por = (c: string) => m.continente.find((e) => e.dpto === c)!;
    expect(por("05").escalon.indice).toBe(4);
    expect(por("23").escalon.indice).toBe(2);
    expect(por("27").escalon.indice).toBe(1);
  });

  it("dibuja en el recuadro solo la isla de San Andrés, no Providencia", () => {
    // El departamento 88 son dos polígonos a 90 km uno de otro. En un recuadro
    // de 58 px los dos son dos puntos de un píxel, y el de Providencia además
    // cae FUERA de la caja: se pintaría suelto sobre el mapa. Se dibuja la isla
    // grande; el enlace sigue siendo el del departamento entero.
    const m = construirModeloMapa([]);
    expect(m.sanAndres!.d.match(/M/g)).toHaveLength(1);
  });

  it("da a cada departamento un camino dibujable", () => {
    const m = construirModeloMapa([]);
    for (const e of [...m.continente, m.sanAndres!]) {
      expect(e.d.startsWith("M")).toBe(true);
      expect(e.d.endsWith("Z")).toBe(true);
    }
  });

  it("ignora una fila cuyo código no existe en la geometría", () => {
    // Si `geografia` sembrara un código nuevo antes de que llegue su polígono,
    // el mapa tiene que seguir pintándose.
    const m = construirModeloMapa([fila("00", "Inventado", "inventado", 99)]);
    expect(m.continente).toHaveLength(32);
    expect(m.continente.every((e) => e.n === 0)).toBe(true);
  });

  it("suma lo que el mapa representa, para poder contrastarlo con el total", () => {
    const m = construirModeloMapa([
      fila("05", "Antioquia", "antioquia", 5155),
      fila("88", "Archipiélago de San Andrés", "archipielago", 81),
    ]);
    expect(m.totalLocalizados).toBe(5236);
  });
});
