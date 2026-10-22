import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TuPerfil from "@/src/components/landing/tu-perfil/TuPerfil";
import PortadaCliente from "@/src/components/landing/PortadaCliente";
import { puede } from "@/src/lib/acceso/politica";

const html = renderToStaticMarkup(<TuPerfil />);

describe("TuPerfil", () => {
  it("titular, cuatro beneficios y los dos accesos", () => {
    expect(html).toContain("¿Puedes participar?");
    for (const t of [
      "Semáforo con tu perfil",
      "Análisis del pliego",
      "Guarda lo que te interesa",
      "Alertas diarias",
    ]) {
      expect(html).toContain(`<h3>${t}</h3>`);
    }
    expect(html).toContain('href="/registro"');
    expect(html).toContain('href="/diagnostico"');
  });

  it("no inventa cifras", () => {
    const texto = html.replace(/<svg.*?<\/svg>/g, "").replace(/<[^>]+>/g, " ");
    expect(texto).not.toMatch(/\d/);
  });

  it("lo que promete como gratuito lo es en la política de acceso", () => {
    for (const c of ["perfil_guardar", "pliego_extraer", "procesos_guardar", "alertas"] as const) {
      expect(puede("gratis", c)).toBe(true);
      expect(puede("anonimo", c)).toBe(false);
    }
    expect(puede("anonimo", "diagnostico")).toBe(true);
  });

  it("la portada tiene la sección después de la Ficha Viva", () => {
    const portada = renderToStaticMarkup(<PortadaCliente />);
    expect(portada.indexOf('id="tu-perfil"')).toBeGreaterThan(portada.indexOf('id="ficha-viva"'));
  });
});
