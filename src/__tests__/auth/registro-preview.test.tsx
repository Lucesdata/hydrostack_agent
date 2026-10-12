import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthCard } from "@/src/components/auth/AuthCard";
import RegistroPreview from "@/src/components/auth/RegistroPreview";
import { procesoPortada } from "../landing/fixtures-portada";
import type { DestacadoPortada } from "@/src/lib/landing/destacados-portada";

const destacados: DestacadoPortada[] = [
  {
    familia: "potable",
    proceso: procesoPortada({ id: "CO1.REQ.1" }),
    cierre: "2099-01-01",
    holgado: true,
  },
  { familia: "residual", proceso: null, cierre: null, holgado: false },
  { familia: "redes", proceso: null, cierre: null, holgado: false },
];
describe("Registro territorial", () => {
  it("el slot reemplaza beneficios solo en la variante de registro", () => {
    const normal = renderToStaticMarkup(
      <AuthCard figLabel="Acceso" title="Ingresar">
        Formulario
      </AuthCard>
    );
    expect(normal).toContain('class="clr-auth-benefits"');
    const registro = renderToStaticMarkup(
      <AuthCard
        figLabel="Cuenta gratuita"
        title="Crear cuenta"
        variante="registro"
        visual={<p>Territorio</p>}
      >
        Formulario
      </AuthCard>
    );
    expect(registro).toContain("Territorio");
    expect(registro).not.toContain('class="clr-auth-benefits"');
    expect(registro).not.toContain("<main");
  });
  it("pinta la ficha y su ruta del contrato, sin inventar procesos de familias vacías", () => {
    const html = renderToStaticMarkup(
      <RegistroPreview destacados={destacados} mapa={<svg aria-label="Colombia" />} />
    );
    expect(html).toContain(destacados[0].proceso!.href);
    expect(html).toContain(destacados[0].proceso!.numeroProceso);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Agua residual");
    expect(html).toContain("entidad contratante");
  });
  it("distingue fallo y ausencia de selección, sin enlaces a fichas ficticias", () => {
    const error = renderToStaticMarkup(<RegistroPreview destacados={null} mapa={<svg />} />);
    const vacio = renderToStaticMarkup(<RegistroPreview destacados={[]} mapa={<svg />} />);
    expect(error).toContain("No pudimos cargar");
    expect(vacio).toContain("No hay procesos destacados");
    for (const html of [error, vacio]) {
      expect(html).not.toContain("/licitaciones/obra-de-prueba");
      expect(html).toContain("/licitaciones");
    }
  });
});
