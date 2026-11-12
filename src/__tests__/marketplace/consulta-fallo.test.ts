import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/db/client", () => ({
  db: {
    select: () => {
      throw new Error("conexión rechazada (secreto: tok_123)");
    },
  },
}));

import { consultarMarketplace } from "@/src/lib/marketplace/consulta";
import { SIN_FILTROS } from "@/src/lib/secop/filtros-vitrina";

describe("consultarMarketplace con la fuente caída", () => {
  it("no lanza: devuelve «no-disponible» y no filtra términos de búsqueda al registro", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const c = await consultarMarketplace({ ...SIN_FILTROS, q: "término privado" });
    expect(c.estado).toBe("no-disponible");
    expect(c.consultadoEn).toMatch(/^\d{4}-/);
    expect(JSON.stringify(log.mock.calls)).not.toContain("término privado");
    log.mockRestore();
  });
});
