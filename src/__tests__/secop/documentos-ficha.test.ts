import { describe, it, expect } from "vitest";
import { filtrarDocumentos, type DocumentoFicha } from "@/src/lib/secop/documentos-ficha";
const documentos: DocumentoFicha[] = Array.from({ length: 25 }, (_, i) => ({
  id: String(i),
  nombre: i === 24 ? "Anexo técnico de conducción.pdf" : `Archivo ${i}.pdf`,
  tipo: "Pliego",
  fecha: "6 oct 2026",
  url: null,
}));
describe("Búsqueda de referencias documentales", () => {
  it("busca por acentos, mayúsculas y fecha en todo el inventario", () => {
    expect(filtrarDocumentos(documentos, "TECNICO conducción 2026").documentos[0].id).toBe("24");
  });
  it("pagina después de filtrar y limita la página a resultados existentes", () => {
    expect(filtrarDocumentos(documentos, "", 2).documentos).toHaveLength(5);
    expect(filtrarDocumentos(documentos, "anexo", 2).pagina).toBe(1);
  });
  it("no confunde ningún resultado con inventario vacío", () => {
    expect(filtrarDocumentos(documentos, "inexistente").total).toBe(0);
    expect(filtrarDocumentos([], "").documentos).toEqual([]);
  });
});
