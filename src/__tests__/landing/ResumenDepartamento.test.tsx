import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TarjetaProceso, {
  estadoDesdeRespuesta,
} from "@/src/components/landing/hero-territorial/ResumenDepartamento";

const fila = {
  id: "CO1.REQ.1",
  objeto: "OPTIMIZACIÓN DE LA PTAR MUNICIPAL",
  entidad: "MUNICIPIO DE CHINU",
  tipoProyecto: "ptar",
  departamento: "CÓRDOBA",
  municipio: "CHINÚ",
  valorEstimado: 4_280_000_000,
  ficha: "/licitaciones/optimizacion-de-la-ptar--CO1.REQ.1",
};

const nada = () => {};
const pintar = (estado: Parameters<typeof TarjetaProceso>[0]["estado"]) =>
  renderToStaticMarkup(<TarjetaProceso estado={estado} />);

describe("estadoDesdeRespuesta", () => {
  it("con destacados, el primero y solo el primero", () => {
    const r = estadoDesdeRespuesta({
      destacados: [fila, { ...fila, id: "CO1.REQ.2", ficha: "/licitaciones/x--CO1.REQ.2" }],
    });
    expect(r.status).toBe("live");
    expect(r.destacado?.id).toBe("CO1.REQ.1");
  });

  it("una lista vacía es «vacío», no error", () => {
    expect(estadoDesdeRespuesta({ destacados: [] })).toEqual({ status: "empty", destacado: null });
  });

  it("shape inválido es error, no «sin procesos»", () => {
    for (const d of [null, undefined, "x", {}, { destacados: null }, { error: "no" }]) {
      expect(estadoDesdeRespuesta(d).status, JSON.stringify(d)).toBe("error");
    }
  });

  it("un primer elemento sin ficha válida deja el destacado no disponible, sin probar el segundo", () => {
    const r = estadoDesdeRespuesta({
      destacados: [{ ...fila, ficha: "https://evil.example" }, fila],
    });
    expect(r).toEqual({ status: "invalido", destacado: null });
  });
});

describe("TarjetaProceso", () => {
  it("cargando: lo dice, reserva el sitio y no inventa un proceso", () => {
    const html = pintar({ status: "loading", destacado: null, reintentar: nada });
    expect(html).toContain("Cargando proceso…");
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("href=");
    // Sin JS el destacado no llega nunca: se explica qué hacer.
    expect(html).toContain("<noscript>");
    expect(html).toContain("Abre un departamento del mapa o utiliza el buscador");
  });

  it("con destacado: chip, objeto real, temas de la ficha y «Ver ficha» a su ficha", () => {
    const { destacado } = estadoDesdeRespuesta({ destacados: [fila] });
    const html = pintar({ status: "live", destacado, reintentar: nada });
    expect(html).toContain("PROCESO SECOP II");
    expect(html).toContain("Optimización de la PTAR municipal");
    expect(html).toContain("Objeto · Presupuesto · Plazos · Requisitos");
    expect(html).toMatch(
      /href="\/licitaciones\/optimizacion-de-la-ptar--CO1\.REQ\.1"[^>]*>Ver ficha/
    );
    expect(html).toContain(
      'aria-label="Ver ficha: Optimización de la PTAR municipal, de Municipio de Chinu"'
    );
    // Una sola acción y un solo destino.
    expect(html.match(/href=/g)).toHaveLength(1);
  });

  it("no pinta cuantía, fecha ni semáforo: la tarjeta no rellena con datos (spec §6)", () => {
    const { destacado } = estadoDesdeRespuesta({ destacados: [fila] });
    const html = pintar({ status: "live", destacado, reintentar: nada });
    expect(html).not.toMatch(/\$\s?4\.280/);
    expect(html).not.toContain("sf-");
    expect(html).not.toContain("Crea tu perfil");
    expect(html).not.toContain("EJEMPLO ILUSTRATIVO");
  });

  it("vacío y destacado no válido: sin enlace a una ficha", () => {
    for (const status of ["empty", "invalido"] as const) {
      const html = pintar({ status, destacado: null, reintentar: nada });
      expect(html).toContain("No hay un proceso destacado disponible en este departamento.");
      expect(html).not.toContain("href=");
    }
  });

  it("error: lo dice y ofrece reintentar, distinto de vacío", () => {
    const html = pintar({ status: "error", destacado: null, reintentar: nada });
    expect(html).toContain("No pudimos cargar el proceso. Inténtalo de nuevo.");
    expect(html).toContain('<button type="button" class="aqReintentar">Reintentar</button>');
    expect(html).not.toContain("No hay un proceso destacado");
    expect(html).not.toContain("href=");
  });
});
