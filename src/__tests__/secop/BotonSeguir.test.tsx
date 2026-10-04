/**
 * «☆ Seguir» sin JavaScript y la frase de cada estado. La interacción (pedir el
 * estado, seguir, dejar de seguir, ir al registro sin sesión) la cubren la ruta
 * (`seguir-route.test.ts`) y el almacenamiento (`seguir/store.db.test.ts`); aquí
 * se mira lo que pinta el servidor y lo que dice el botón.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BotonSeguir, { textoBoton } from "@/src/components/secop/seguir/BotonSeguir";

describe("BotonSeguir — HTML del servidor", () => {
  it("es un botón «☆ Seguir» sin pulsar, no un enlace", () => {
    const html = renderToStaticMarkup(<BotonSeguir id="CO1.REQ.1" variante="ficha" />);
    expect(html).toContain(
      '<button type="button" class="sg-boton" aria-pressed="false">☆ Seguir</button>'
    );
    expect(html).not.toContain("<a ");
  });
});

describe("lo que dice el botón", () => {
  it("sin seguir", () => {
    expect(textoBoton(undefined)).toEqual({ etiqueta: "☆ Seguir", ayuda: null });
  });

  it("seguido a mano: se puede dejar", () => {
    expect(textoBoton({ siguiendo: true, manual: true })).toEqual({
      etiqueta: "★ Siguiendo",
      ayuda: null,
    });
  });

  it("seguido por perfil o filtro: lo dice, porque no se puede dejar desde aquí", () => {
    const t = textoBoton({ siguiendo: true, manual: false });
    expect(t.etiqueta).toBe("★ Siguiendo");
    expect(t.ayuda).toMatch(/perfil o un filtro/);
  });
});
