/**
 * El HTML que el servidor sirve del bloque de decisión, antes de cualquier
 * JavaScript: es lo que ve un buscador, lo que se cachea 12 h y lo que ve quien
 * llega sin nada (criterio 5 del spec). Lo relativo —perfil, veredicto, días
 * restantes— llega después, en el navegador, y lo cubren los tests de
 * `semaforo.test.ts` y `sincronizar-perfil.test.ts`.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BloqueDecision, {
  hrefsDePaso,
  type DatosDecision,
} from "@/src/components/secop/ficha/BloqueDecision";
import { compuertasAbsolutas } from "@/src/lib/secop/semaforo";
import type { SecopProceso } from "@/src/lib/secop/types";

const proceso = { id: "CO1.REQ.123" } as SecopProceso;

function datos(over: Partial<DatosDecision> = {}): DatosDecision {
  return {
    proceso,
    absolutas: compuertasAbsolutas({
      tipoProyecto: "ptar",
      valorEstimado: 4_280_000_000,
      departamento: "Boyacá",
      municipio: "Tunja",
      estadoApertura: "Abierto",
      fechaRecepcion: "2026-10-14T00:00:00Z",
    }),
    conPliego: false,
    urlSecop: "https://community.secop.gov.co/x",
    presupuesto: "$4.280.000.000",
    conPresupuesto: true,
    fechaPublicacion: "2026-09-14T00:00:00Z",
    fechaRecepcion: "2026-10-14T00:00:00Z",
    fechaPublicacionTexto: "14 sept 2026",
    fechaRecepcionTexto: "14 oct 2026",
    estadoApertura: "Abierto",
    modalidad: "Licitación pública",
    hrefExplorar: "/licitaciones/tipo/ptar",
    ...over,
  };
}

const html = (over: Partial<DatosDecision> = {}) =>
  renderToStaticMarkup(<BloqueDecision {...datos(over)} />);

describe("BloqueDecision — HTML sin JavaScript", () => {
  it("dice la lectura absoluta, sin juzgar a nadie", () => {
    const h = html();
    expect(h).toContain("Esto exige el proceso. Si te sirve, depende de tu empresa.");
    expect(h).toContain("Lecturas del proceso · aún sin tu perfil");
    expect(h).toContain("Proyecto de PTAR.");
    expect(h).toContain(
      "Entidad contratante ubicada en Tunja, Boyacá. Lugar de ejecución no confirmado."
    );
    expect(h).not.toMatch(/\bcumplen?\b/);
  });

  it("el siguiente paso es definir el perfil, sin cuenta (D1)", () => {
    const h = html();
    expect(h).toMatch(/<button[^>]*class="fd-cta"[^>]*>Define tu perfil<\/button>/);
    expect(h).toContain("sin crear cuenta");
    expect(h).toContain('href="https://community.secop.gov.co/x"');
  });

  it("los tres datos de decisión, con el presupuesto y la modalidad explicada", () => {
    const h = html();
    expect(h).toContain("$4.280.000.000");
    expect(h).toContain("14 oct 2026");
    expect(h).toContain("¿Qué significa?");
    expect(h).toContain("Convocatoria abierta");
  });

  it("«quedan N días» no está en el HTML cacheado: se calcula en el navegador (criterio 7)", () => {
    const h = html();
    expect(h).not.toMatch(/quedan \d+ días|cierra hoy|plazo vencido/);
    expect(h).not.toContain("fd-barra");
  });

  it("sin presupuesto publicado nunca dice «$0» (criterio 8)", () => {
    const h = html({ presupuesto: "Sin presupuesto publicado", conPresupuesto: false });
    expect(h).toContain("Sin presupuesto publicado");
    expect(h).not.toContain("$0");
  });

  it("sin fecha de recepción no inventa plazo", () => {
    const h = html({ fechaRecepcion: null, fechaRecepcionTexto: null });
    expect(h).toContain("El SECOP no publica la fecha de cierre en este dataset");
  });

  it("modalidad desconocida: no ofrece explicación inventada", () => {
    const h = html({ modalidad: "Otra modalidad" });
    expect(h).toContain("Otra modalidad");
    expect(h).not.toContain("¿Qué significa?");
  });

  it("sin URL de expediente no pinta un enlace roto al SECOP", () => {
    const h = html({ urlSecop: null });
    expect(h).not.toContain("community.secop.gov.co");
    expect(h).not.toContain("Prefiero verlo en SECOP II");
  });

  it("no promete alertas ni seguimiento de cambios", () => {
    expect(html()).not.toMatch(/alerta|seguimiento|te avisamos/i);
  });

  it("el formulario del perfil no se pinta hasta que se pide", () => {
    expect(html()).not.toContain("fd-wizard");
  });
});

describe("BloqueDecision fuera de la ficha (panel del Radar, 2026-10-04)", () => {
  it("los pasos al pliego apuntan a la ficha, no a un #pliego de la vitrina", () => {
    expect(hrefsDePaso(datos())["subir-pliego"]).toBe("#pliego");
    const enPanel = hrefsDePaso(datos({ hrefFicha: "/licitaciones/ptar-tunja--CO1.REQ.123" }));
    expect(enPanel["subir-pliego"]).toBe("/licitaciones/ptar-tunja--CO1.REQ.123#pliego");
    expect(enPanel["requisitos-pliego"]).toBe("/licitaciones/ptar-tunja--CO1.REQ.123#pliego");
    expect(enPanel["ofertar-secop"]).toBe("https://community.secop.gov.co/x");
  });
});
