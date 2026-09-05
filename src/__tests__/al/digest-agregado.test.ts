/**
 * Correo diario agregado (SDD §7.1).
 *
 * El caso que justifica el archivo es el del tope. Corriendo el dry-run contra
 * datos reales salieron **547 aperturas en un solo correo**: eso no es un
 * digest, es un volcado. Y no es un caso raro — el primer día de cualquier
 * filtro nuevo todo es nuevo, así que sin tope el primer correo siempre sería
 * una avalancha.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderDigestAgregado } from "@/src/lib/al/notificacion/digest-agregado";
import type { Novedades } from "@/src/lib/al/notificacion/recopilar";

// Mismo patrón que `__tests__/email/digest.test.ts`: el token de baja se firma
// con AUTH_SECRET y el render construye URLs absolutas con APP_URL.
const ORIGINAL_SECRET = process.env.AUTH_SECRET;
const ORIGINAL_URL = process.env.NEXT_PUBLIC_APP_URL;

beforeEach(() => {
  process.env.AUTH_SECRET = "test-secret";
  process.env.NEXT_PUBLIC_APP_URL = "https://aqualicita.vercel.app";
});

afterEach(() => {
  process.env.AUTH_SECRET = ORIGINAL_SECRET;
  process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_URL;
});

const USUARIO = { id: "u1", email: "a@b.com" };
const REPORTE = "https://aqualicita.vercel.app/reportes/digest-x";

const apertura = (i: number) => ({
  secopProcesoId: `CO1.REQ.${i}`,
  titulo: `Proceso ${i}`,
  entidad: "ENTIDAD",
  url: `https://secop/${i}`,
  valorEstimado: "100000000.00",
  filtroNombre: "Mi filtro",
});

const adenda = (i: number) => ({
  secopProcesoId: `CO1.REQ.${i}`,
  titulo: `Proceso ${i}`,
  entidad: "ENTIDAD",
  url: null,
  valorEstimado: "1000.00",
  estadoNuevo: "Publicado",
  valorNuevo: "2000.00",
  delta: [
    { campo: "precio_base", etiqueta: "Presupuesto oficial", antes: "1000.00", despues: "2000.00" },
  ],
});

const novedades = (over: Partial<Novedades> = {}): Novedades => {
  const n = { adendas: [], adjudicaciones: [], aperturas: [], ...over } as Novedades;
  n.total = n.adendas.length + n.adjudicaciones.length + n.aperturas.length;
  return n;
};

describe("renderDigestAgregado — tope por sección", () => {
  it("no lista 547 aperturas: corta en 10 y remite al reporte", () => {
    const n = novedades({ aperturas: Array.from({ length: 547 }, (_, i) => apertura(i)) });
    const d = renderDigestAgregado(n, USUARIO, REPORTE);

    expect(d.text).toContain("Proceso 9");
    expect(d.text).not.toContain("Proceso 10");
    expect(d.text).toContain("y 537 más");
    expect(d.html).toContain("y 537 más en el reporte completo");
    expect(d.html).toContain(REPORTE);
  });

  it("sin recorte no aparece el 'y N más'", () => {
    const n = novedades({ aperturas: [apertura(1), apertura(2)] });
    const d = renderDigestAgregado(n, USUARIO, REPORTE);
    expect(d.text).not.toContain("más en el reporte");
  });

  it("el tope se aplica a cada sección por separado", () => {
    const n = novedades({
      adendas: Array.from({ length: 12 }, (_, i) => adenda(i)),
      aperturas: Array.from({ length: 30 }, (_, i) => apertura(100 + i)),
    });
    const d = renderDigestAgregado(n, USUARIO, REPORTE);
    expect(d.text).toContain("y 2 más");
    expect(d.text).toContain("y 20 más");
  });

  it("sin reporte, el 'y N más' sigue apareciendo pero sin enlace", () => {
    const n = novedades({ aperturas: Array.from({ length: 15 }, (_, i) => apertura(i)) });
    const d = renderDigestAgregado(n, USUARIO, null);
    expect(d.html).toContain("y 5 más");
    // No se puede comprobar la ausencia de `<a href="https://aqualicita`: el
    // enlace de baja usa el mismo dominio y va siempre. Lo que importa es que el
    // recorte no prometa un reporte que no existe.
    expect(d.html).not.toContain("y 5 más en el reporte completo");
  });
});

describe("renderDigestAgregado — contenido", () => {
  it("la adenda lleva su diff con antes y después", () => {
    const d = renderDigestAgregado(novedades({ adendas: [adenda(1)] }), USUARIO, REPORTE);
    expect(d.text).toContain("Presupuesto oficial: 1000.00 → 2000.00");
    expect(d.html).toContain("Presupuesto oficial");
  });

  it("el asunto dice QUÉ hay, no cuántas cosas hay", () => {
    const d = renderDigestAgregado(
      novedades({ adendas: [adenda(1), adenda(2)], aperturas: [apertura(3)] }),
      USUARIO,
      REPORTE
    );
    expect(d.subject).toBe("AquaLicita: 2 adendas, 1 nueva");
  });

  it("escapa el HTML del contenido de la fuente", () => {
    // Los títulos vienen de SECOP, no de nosotros.
    const n = novedades({
      aperturas: [{ ...apertura(1), titulo: '<script>alert("x")</script>' }],
    });
    const d = renderDigestAgregado(n, USUARIO, REPORTE);
    expect(d.html).not.toContain("<script>");
    expect(d.html).toContain("&lt;script&gt;");
  });

  it("el enlace de baja va siempre, haya lo que haya", () => {
    const d = renderDigestAgregado(novedades({ aperturas: [apertura(1)] }), USUARIO, REPORTE);
    expect(d.html).toContain(d.unsubscribeUrl);
    expect(d.text).toContain(d.unsubscribeUrl);
  });
});
