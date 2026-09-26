import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PreguntasFrecuentes from "@/src/components/landing/preguntas/PreguntasFrecuentes";
import {
  PREGUNTAS_FRECUENTES,
  faqJsonLd,
  jsonLdSeguro,
} from "@/src/lib/landing/preguntas-frecuentes";

describe("preguntas frecuentes", () => {
  const html = renderToStaticMarkup(<PreguntasFrecuentes />);

  it("el JSON-LD repite exactamente lo que se ve", () => {
    const script = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1];
    expect(script).toBeTruthy();
    const datos = JSON.parse(script!);
    expect(datos["@type"]).toBe("FAQPage");
    expect(datos.mainEntity).toHaveLength(PREGUNTAS_FRECUENTES.length);
    for (const p of PREGUNTAS_FRECUENTES) {
      expect(html).toContain(`<summary>${p.pregunta}</summary>`);
      expect(html).toContain(p.respuesta);
    }
    expect(datos).toEqual(faqJsonLd());
  });

  it("se abre sin JavaScript: details nativo", () => {
    expect(html.match(/<details/g)).toHaveLength(PREGUNTAS_FRECUENTES.length);
  });

  it("no promete alertas, que no se entregan (PENDIENTES §0)", () => {
    expect(JSON.stringify(PREGUNTAS_FRECUENTES).toLowerCase()).not.toContain("alerta");
  });

  it("un </script> en un texto no puede cerrar la etiqueta", () => {
    expect(jsonLdSeguro({ t: "</script><b>" })).not.toContain("</script>");
    expect(JSON.parse(jsonLdSeguro({ t: "</script>" })).t).toBe("</script>");
  });
});
