import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TuPerfil from "@/src/components/landing/tu-perfil/TuPerfil";
import PortadaCliente from "@/src/components/landing/PortadaCliente";
import { puede } from "@/src/lib/acceso/politica";
import { ETIQUETA_COMPUERTA } from "@/src/lib/secop/semaforo";

const html = renderToStaticMarkup(<TuPerfil />);
const texto = html
  .replace(/<svg.*?<\/svg>/g, "")
  .replace(/<img[^>]*>/g, "")
  .replace(/<[^>]+>/g, " ");

describe("TuPerfil", () => {
  it("eyebrow, titular y los dos accesos, con el diagnóstico como principal", () => {
    expect(html).toContain("Verifica tu elegibilidad");
    expect(html).toContain("¿Puedes participar?");
    expect(html).toContain("Compruébalo antes de leer el pliego.");
    const principal = html.match(/<a class="[^"]*principal[^"]*" href="([^"]+)"/);
    expect(principal?.[1]).toBe("/diagnostico");
    expect(html).toContain('href="/registro"');
  });

  it("el semáforo y las tres tarjetas enlazan por su título", () => {
    for (const [titulo, href] of [
      ["Semáforo con tu perfil", "/diagnostico"],
      ["Análisis del pliego", "/registro"],
      ["Guarda lo que te interesa", "/registro"],
      ["Alertas diarias", "/registro"],
    ]) {
      expect(html).toMatch(new RegExp(`<h3><a [^>]*href="${href}"[^>]*>${titulo}</a></h3>`));
    }
  });

  it("el ejemplo usa las cinco compuertas reales, rotulado como ilustrativo", () => {
    expect(html).toContain("Ejemplo ilustrativo");
    for (const etiqueta of Object.values(ETIQUETA_COMPUERTA)) expect(texto).toContain(etiqueta);
    for (const palabra of ["cumple", "revisar", "no cumple"]) expect(texto).toContain(palabra);
    expect(texto).toContain("Revisa siempre el pliego.");
  });

  it("no inventa cifras", () => {
    expect(texto).not.toMatch(/\d/);
  });

  it("no promete lo que no existe: ni «cambios» en las alertas ni «criterios»", () => {
    expect(texto).not.toMatch(/cambios/i);
    expect(texto).not.toMatch(/criterios/i);
    expect(texto).not.toMatch(/siempre privados/i);
  });

  it("lo que promete como gratuito lo es en la política de acceso", () => {
    for (const c of ["perfil_guardar", "pliego_extraer", "procesos_guardar", "alertas"] as const) {
      expect(puede("gratis", c)).toBe(true);
      expect(puede("anonimo", c)).toBe(false);
    }
    expect(puede("anonimo", "diagnostico")).toBe(true);
  });

  it("las imágenes son decorativas, diferidas y existen", () => {
    const imgs = [...html.matchAll(/<img[^>]*>/g)].map((m) => m[0]);
    expect(imgs).toHaveLength(4);
    for (const img of imgs) {
      expect(img).toContain('alt=""');
      expect(img).toContain('loading="lazy"');
      const src = img.match(/src="([^"]+)"/)![1];
      expect(() => readFileSync(`public${src}`)).not.toThrow();
    }
  });

  it("la portada tiene la sección después de la Ficha Viva", () => {
    const portada = renderToStaticMarkup(<PortadaCliente />);
    expect(portada.indexOf('id="tu-perfil"')).toBeGreaterThan(portada.indexOf('id="ficha-viva"'));
  });
});
