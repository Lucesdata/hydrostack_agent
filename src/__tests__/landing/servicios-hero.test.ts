import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { serviciosDelHero } from "../../lib/landing/servicios-hero";

const app = path.resolve(__dirname, "../../../app");

describe("accesos del hero a los servicios", () => {
  it("no enlaza Comercial cuando la bandera está apagada", () => {
    const comercial = serviciosDelHero(false).find((s) => s.id === "comercial");
    expect(comercial?.href).toBeNull();
    expect(comercial?.detalle).toBe("En activación");
  });

  it("enlaza Comercial exclusivamente cuando está habilitado", () => {
    const comercial = serviciosDelHero(true).find((s) => s.id === "comercial");
    expect(comercial?.href).toBe("/comercial/explorar");
  });

  it("no anuncia vacantes ni presenta Talent como producto público", () => {
    const talento = serviciosDelHero(true).find((s) => s.id === "talento");
    expect(talento?.href).toBeNull();
    expect(talento?.detalle).toContain("Validación");
  });

  it("solo usa destinos que tienen una página real", () => {
    for (const servicio of serviciosDelHero(true)) {
      if (!servicio.href) continue;
      const carpeta = path.join(app, servicio.href.slice(1));
      expect(
        ["page.tsx", "page.jsx", "page.ts", "page.js"].some((nombre) =>
          existsSync(path.join(carpeta, nombre))
        ),
        `Falta página para ${servicio.href}`
      ).toBe(true);
    }
  });

  it("muestra todos los servicios con identificadores únicos", () => {
    const servicios = serviciosDelHero(false);
    expect(servicios).toHaveLength(5);
    expect(new Set(servicios.map((s) => s.id)).size).toBe(servicios.length);
  });
});
