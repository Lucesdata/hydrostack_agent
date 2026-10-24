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
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ");

describe("TuPerfil", () => {
  it("eyebrow, titular y los dos accesos, con el diagnóstico como principal", () => {
    expect(texto).toContain("¿Estás preparado para participar?");
    expect(texto).toContain(
      "Evalúa tu preparación general y descubre qué aspectos debes fortalecer antes de revisar un proceso."
    );
    const principal = html.match(/<a class="[^"]*principal[^"]*" href="([^"]+)"/);
    expect(principal?.[1]).toBe("/diagnostico");
    expect(html).toContain('href="/registro"');
  });

  it("el semáforo y las tres tarjetas enlazan por su título", () => {
    for (const [titulo, href] of [
      ["Compara procesos con tu perfil", "/mis-coincidencias"],
      ["Análisis del pliego", "/registro"],
      ["Guarda lo que te interesa", "/registro"],
    ]) {
      expect(html).toMatch(new RegExp(`<h3><a [^>]*href="${href}"[^>]*>${titulo}</a></h3>`));
    }
  });

  it("el cruce con el perfil conduce a coincidencias y avisa de cuenta y perfil", () => {
    expect(texto).toContain("Requiere cuenta y perfil");
    expect(texto).toContain("sin datos");
    expect(html).not.toMatch(/<a [^>]*href="\/diagnostico"[^>]*>Compara/);
  });

  it("el diagnóstico es preparación general: no promete verificar un proceso ni evidencias", () => {
    expect(texto).not.toMatch(/elegibilidad|qué cumples|RUP|experiencia|capacidad financiera/i);
    expect(texto).not.toMatch(/antes de leer el pliego/i);
  });

  it("las alertas figuran en validación, sin enlace ni llamada a activar", () => {
    expect(html).toMatch(/<h3>Alertas por correo — en validación<\/h3>/);
    expect(texto).not.toMatch(
      /alertas diarias|recibe en tu correo|activa tus alertas|crear alerta/i
    );
  });

  it("el ejemplo usa las cinco compuertas reales, rotulado como ilustrativo", () => {
    expect(html).toContain("Ejemplo ilustrativo");
    for (const etiqueta of Object.values(ETIQUETA_COMPUERTA)) expect(texto).toContain(etiqueta);
    for (const palabra of ["cumple", "revisar", "no cumple"]) expect(texto).toContain(palabra);
    expect(texto).toContain("Revisa siempre el pliego vigente.");
  });

  it("no inventa cifras", () => {
    expect(texto).not.toMatch(/\d/);
  });

  it("no promete lo que no existe: ni «cambios»/adendas ni «criterios»", () => {
    expect(texto).not.toMatch(/cambios|adenda/i);
    expect(texto).not.toMatch(/criterios/i);
    expect(texto).not.toMatch(/siempre privados/i);
  });

  it("lo que promete como gratuito lo es en la política de acceso", () => {
    for (const c of [
      "perfil_guardar",
      "pliego_extraer",
      "procesos_guardar",
      "coincidencias",
    ] as const) {
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
