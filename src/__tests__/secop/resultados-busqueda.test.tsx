import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SecopProceso } from "@/src/lib/secop/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/licitaciones/explorar",
}));
vi.mock("@/src/lib/secop/cached-db-search", () => ({
  searchProcesosDbCached: vi.fn(),
  countProcesosDbCached: vi.fn(),
}));
import Page from "@/app/licitaciones/explorar/page";
import { searchProcesosDbCached, countProcesosDbCached } from "@/src/lib/secop/cached-db-search";

const proceso: SecopProceso = {
  id: "CO1.REQ.42",
  referencia: "R-42",
  nombre: "CONSULTORÍA DE PTAR",
  descripcion: "",
  entidad: "Entidad de prueba",
  departamento: "Santander",
  ciudad: "Chipatá",
  estado: "Publicado",
  fase: "",
  modalidad: "",
  tipoContrato: "Consultoría",
  fechaPublicacion: null,
  precioBase: 0,
  adjudicado: false,
  valorAdjudicacion: null,
  adjudicatario: null,
  unspsc: null,
  url: null,
  estadoApertura: "Cerrado",
  documentAccess: "UNKNOWN",
  accessMessage: "",
  coincidencia: "exacta",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(searchProcesosDbCached).mockResolvedValue({ items: [proceso], page: 1, pageSize: 25 });
  vi.mocked(countProcesosDbCached).mockResolvedValue(60);
});

describe("explorador guiado con HTML del servidor", () => {
  it("sirve criterios y enlaces a fichas sin esperar a JavaScript", async () => {
    const html = renderToStaticMarkup(
      await Page({
        searchParams: {
          modo: "tema",
          sistema: "ptar",
          actividad: "consultoria",
          q: "bombeo",
        },
      })
    );
    expect(html).toContain('method="get"');
    expect(html).toContain('value="ptar" selected=""');
    expect(html).toContain('value="consultoria" selected=""');
    expect(html).toContain('value="bombeo"');
    expect(html).toContain('href="/licitaciones/consultoria-de-ptar--CO1.REQ.42"');
    expect(html).toContain("Sin presupuesto publicado");
    expect(html).not.toContain("$0");
  });

  it("pagina conservando sistema, actividad y texto en enlaces reales", async () => {
    const html = renderToStaticMarkup(
      await Page({
        searchParams: {
          modo: "tema",
          sistema: "ptar",
          actividad: "consultoria",
          q: "bombeo",
        },
      })
    );
    expect(html).toContain("sistema=ptar");
    expect(html).toContain("actividad=consultoria");
    expect(html).toContain("q=bombeo");
    expect(html).toContain("page=2");
  });

  it("el número muestra cerrados y el grado de coincidencia", async () => {
    const html = renderToStaticMarkup(
      await Page({ searchParams: { modo: "numero", numero: "R-42" } })
    );
    expect(html).toContain("Cerrado");
    expect(html).toContain("Coincidencia exacta");
    expect(html).toContain('value="R-42"');
    expect(searchProcesosDbCached).toHaveBeenCalledWith(
      expect.objectContaining({
        modo: "numero",
        numero: "R-42",
        apertura: undefined,
      })
    );
  });

  it("un error de base conserva campos y no se presenta como vacío", async () => {
    vi.mocked(searchProcesosDbCached).mockRejectedValue(new Error("fallo interno privado"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const html = renderToStaticMarkup(
        await Page({ searchParams: { modo: "numero", numero: "R-42" } })
      );
      expect(html).toContain("No pudimos cargar los resultados");
      expect(html).toContain('value="R-42"');
      expect(html).not.toContain("No encontramos ese proceso");
      expect(html).not.toContain("fallo interno privado");
    } finally {
      log.mockRestore();
    }
  });

  it("criterios inválidos muestran corrección sin consultar la base", async () => {
    const html = renderToStaticMarkup(
      await Page({ searchParams: { modo: "tema", sistema: "inventado" } })
    );
    expect(html).toContain("Sistema no válido");
    expect(searchProcesosDbCached).not.toHaveBeenCalled();
  });
});
