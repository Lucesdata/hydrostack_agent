import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import BandaMercado, {
  N_RECIENTES,
  formatFechaCorta,
} from "@/src/components/landing/hero-territorial/BandaMercado";
import ProcesosTicker, { mapApiItem } from "@/src/components/landing/ProcesosTicker";

const proceso = (i: number, extra = {}) =>
  mapApiItem({
    id: `CO1.REQ.${i}`,
    objeto: `OPTIMIZACIÓN DE LA PTAR ${i}`,
    entidad: "MUNICIPIO DE CHINU",
    tipoProyecto: "ptar",
    departamento: "CÓRDOBA",
    municipio: "CHINÚ",
    valorEstimado: 4_280_000_000,
    estado: "Publicado",
    ficha: `/licitaciones/optimizacion-de-la-ptar--CO1.REQ.${i}`,
    fechaPublicacion: "2026-09-24T15:00:00.000Z",
    ...extra,
  });

const banda = (recientes: unknown) =>
  renderToStaticMarkup(<BandaMercado sector={null} heroStats={null} recientes={recientes} />);

describe("últimos procesos en la banda", () => {
  it("muestra los tres más recientes, cada uno enlazado a su ficha", () => {
    const items = [1, 2, 3, 4, 5].map((i) => proceso(i));
    const html = banda({ status: "live", items });
    expect(N_RECIENTES).toBe(3);
    expect(html.match(/<li>/g)).toHaveLength(3);
    expect(html).toContain('href="/licitaciones/optimizacion-de-la-ptar--CO1.REQ.1"');
    expect(html).not.toContain("CO1.REQ.4");
  });

  it("el color va con el nombre del tipo, y con lugar, monto y fecha", () => {
    const html = banda({ status: "live", items: [proceso(1)] });
    expect(html).toContain("PTAR");
    expect(html).toContain("--tipo:#D39A62");
    expect(html).toContain("Chinú, Córdoba · $4.280 M · publicado el 24 de sept");
  });

  it("sin tipo no inventa uno", () => {
    const html = banda({ status: "live", items: [proceso(1, { tipoProyecto: null })] });
    expect(html).not.toContain("aqMercadoTipo");
  });

  it("cargando o sin datos: nunca procesos ficticios", () => {
    expect(banda({ status: "loading", items: [] })).toContain("Cargando fichas");
    const vacio = banda({ status: "empty", items: [] });
    expect(vacio).toContain('<p class="aqMercadoVacio">—</p>');
    expect(banda(null)).toContain('<p class="aqMercadoVacio">—</p>');
  });

  it("la fecha que no se puede leer no se muestra", () => {
    expect(formatFechaCorta(null)).toBeNull();
    expect(formatFechaCorta("no es fecha")).toBeNull();
  });
});

describe("una sola petición para ticker y banda", () => {
  it("el ticker que recibe los datos los pinta y no pide nada", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const html = renderToStaticMarkup(
      <ProcesosTicker recientes={{ status: "live", items: [proceso(1)] }} />
    );
    vi.unstubAllGlobals();
    expect(html).toContain("Fichas recientes");
    expect(html).toContain('class="ptr-item"');
    expect(fetch).not.toHaveBeenCalled();
  });
});
