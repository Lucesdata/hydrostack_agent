import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ProcessDetail from "@/src/components/secop/ProcessDetail";
import type { ProcesoVeredicto } from "@/src/components/secop/ProcessList";
import type { VerdictRespuesta } from "@/src/lib/secop/verdict-publico";

const gate = (status: string) => ({ status, reason: null, requiredLevel: 0 });

const VEREDICTO = {
  overall: "WARN",
  gates: {
    sectorial: gate("PASS"),
    cuantia: gate("WARN"),
    plazo: gate("FAIL"),
    ubicacion: gate("PASS"),
    habilitacion: gate("UNKNOWN"),
  },
} as unknown as VerdictRespuesta;

const PROCESO = {
  id: "p1",
  nombre: "Construcción de PTAR",
  referencia: "CO1.REQ.1",
  entidad: "Municipio de Prueba",
} as unknown as ProcesoVeredicto;

const noop = () => {};

describe("ProcessDetail: barra del semáforo (PENDIENTES §22-§23)", () => {
  const html = renderToStaticMarkup(
    <ProcessDetail
      proceso={PROCESO}
      access={{ state: "UNKNOWN", message: "" }}
      probing={false}
      onBack={noop}
      verdict={VEREDICTO}
      hasPerfil
      escalonOferente={null}
      faltaExperiencia={false}
      onRequestPerfil={noop}
    />
  );
  const barra = html.match(/<div class="clr-elig-bar"[^>]*>(.*?)<\/div>/)?.[0] ?? "";

  it("cada tramo lleva su glifo: el color no viaja solo", () => {
    const tramos = [...barra.matchAll(/clr-elig-seg--(\w+)">([^<]+)</g)].map((m) => [m[1], m[2]]);
    expect(tramos).toEqual([
      ["pass", "✓"],
      ["warn", "!"],
      ["fail", "✕"],
      ["pass", "✓"],
      ["unknown", "?"],
    ]);
  });

  it("la barra es un resumen: se oculta a lectores de pantalla, la lista lo dice con palabras", () => {
    expect(barra).toContain('aria-hidden="true"');
    expect(html).toContain("Sin datos");
  });
});
