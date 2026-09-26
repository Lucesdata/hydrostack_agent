import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ResumenDepartamento, {
  Sparkline,
  rotuloSemana,
} from "@/src/components/landing/hero-territorial/ResumenDepartamento";

describe("Sparkline", () => {
  it("una barra por semana con publicaciones y una línea de cero donde no hubo", () => {
    const html = renderToStaticMarkup(<Sparkline semanas={[3, 0, 5]} />);
    expect(html.match(/class="aqSparkBarra"/g)).toHaveLength(2);
    expect(html.match(/class="aqSparkCero"/g)).toHaveLength(1);
    expect(html).toContain("<title>Últimos 7 días: 5 publicados</title>");
    expect(html).toContain("<title>Hace 2 semanas: 3 publicados</title>");
  });

  it("todo en cero no divide por cero", () => {
    const html = renderToStaticMarkup(<Sparkline semanas={[0, 0]} />);
    expect(html).not.toContain("NaN");
  });
});

describe("rotuloSemana", () => {
  it("cuenta hacia atrás desde la última", () => {
    expect(rotuloSemana(11, 12)).toBe("Últimos 7 días");
    expect(rotuloSemana(10, 12)).toBe("Hace 1 semana");
    expect(rotuloSemana(0, 12)).toBe("Hace 11 semanas");
  });
});

describe("ResumenDepartamento", () => {
  it("antes de cargar dice que carga y nombra el departamento", () => {
    const html = renderToStaticMarkup(
      <ResumenDepartamento departamento={{ clave: "05", label: "Antioquia" }} />
    );
    expect(html).toContain("Publicados por semana · Antioquia");
    expect(html).toContain("Cargando…");
    expect(html).not.toContain("aqDestacados");
  });

  it("sin departamento no pinta nada", () => {
    expect(renderToStaticMarkup(<ResumenDepartamento departamento={null} />)).toBe("");
  });
});
