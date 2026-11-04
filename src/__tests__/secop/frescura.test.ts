import { describe, expect, it } from "vitest";
import { etiquetasFrescura } from "@/src/lib/secop/frescura";

describe("etiquetasFrescura", () => {
  it("separa la sincronización de AquaLicita de lo publicado en SECOP", () => {
    const e = etiquetasFrescura({
      sincronizacion: "2026-10-19T11:57:00.000Z",
      publicadoSecop: "2026-10-17T00:00:00.000Z",
      error: false,
    });
    expect(e.sincronizacion).toMatch(
      /^Última sincronización de AquaLicita: .*19.*2026.*06:57.*COT$/
    );
    expect(e.publicadoSecop).toMatch(/^Última actualización publicada en SECOP: .*17.*2026$/);
  });

  it("la fecha de SECOP es un día en UTC: no se corre al día anterior en Colombia", () => {
    const e = etiquetasFrescura({
      sincronizacion: null,
      publicadoSecop: "2026-10-17T02:00:00.000Z",
      error: false,
    });
    expect(e.publicadoSecop).toContain("17");
  });

  it("sin dato lo dice, cada línea por separado", () => {
    const e = etiquetasFrescura({
      sincronizacion: null,
      publicadoSecop: "2026-10-17T00:00:00.000Z",
      error: false,
    });
    expect(e.sincronizacion).toBe("Última sincronización de AquaLicita: no disponible");
    expect(e.publicadoSecop).not.toContain("no disponible");
    const vacio = etiquetasFrescura({
      sincronizacion: "basura",
      publicadoSecop: null,
      error: true,
    });
    expect(vacio.sincronizacion).toContain("no disponible");
    expect(vacio.publicadoSecop).toContain("no disponible");
  });
});
