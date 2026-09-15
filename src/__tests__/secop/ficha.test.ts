import { describe, it, expect } from "vitest";
import { idDesdeSlug, slugDeProceso } from "@/src/lib/secop/ficha";

/**
 * El slug de la ficha es superficie SEO y clave de resolución a la vez: si el
 * ida y vuelta falla, la URL que el sitemap publica devuelve un 404.
 */
describe("slug de una ficha", () => {
  it("lleva texto legible y el id nativo, separados por doble guion", () => {
    const s = slugDeProceso("CONSTRUCCIÓN DE LA PTAR DEL MUNICIPIO", "CO1.REQ.1234567");
    expect(s).toBe("construccion-de-la-ptar-del-municipio--CO1.REQ.1234567");
  });

  it("el ida y vuelta devuelve el id exacto", () => {
    for (const objeto of [
      "CONSTRUCCIÓN DE LA PTAR",
      "Reposición de redes de acueducto y alcantarillado — fase II",
      "O.C 028-2026 COMPRA",
      "¡Suministro! de cloro (gaseoso)",
    ]) {
      expect(idDesdeSlug(slugDeProceso(objeto, "CO1.REQ.999"))).toBe("CO1.REQ.999");
    }
  });

  it("el doble guion no se confunde con los guiones del texto", () => {
    // Es la razón de usar `--`: partir por el último `-` daría un id truncado
    // en cuanto el objeto lleve un guion, que es casi siempre.
    const s = slugDeProceso("O.C 028-2026 COMPRA DE INSUMOS", "CO1.REQ.42");
    expect(s).toContain("-");
    expect(idDesdeSlug(s)).toBe("CO1.REQ.42");
  });

  it("recorta el texto para que la URL no sea interminable", () => {
    // Los objetos del SECOP llegan a 300 caracteres.
    const largo = slugDeProceso(
      "PRESTACION DE SERVICIOS PROFESIONALES ESPECIALIZADOS PARA APOYAR LA SUPERVISION TECNICA ADMINISTRATIVA Y FINANCIERA",
      "CO1.REQ.7"
    );
    expect(largo.split("--")[0].split("-")).toHaveLength(9);
  });

  it("un objeto vacío deja el id solo, no un slug que empiece por doble guion", () => {
    expect(slugDeProceso(null, "CO1.REQ.5")).toBe("CO1.REQ.5");
    expect(idDesdeSlug("CO1.REQ.5")).toBe("CO1.REQ.5");
  });

  it("rechaza lo que no tiene forma de id del SECOP", () => {
    // Evita que `/licitaciones/cualquier-cosa` haga una consulta inútil a la
    // base antes de responder 404.
    expect(idDesdeSlug("tipo")).toBeNull();
    expect(idDesdeSlug("algo--no-es-un-id")).toBeNull();
    expect(idDesdeSlug("")).toBeNull();
  });

  it("acepta el id en minúsculas y lo normaliza", () => {
    expect(idDesdeSlug("ptar--co1.req.88")).toBe("CO1.REQ.88");
  });
});
