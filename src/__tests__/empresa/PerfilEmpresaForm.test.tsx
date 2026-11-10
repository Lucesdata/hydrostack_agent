import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PerfilEmpresaForm from "@/src/components/comercial/PerfilEmpresaForm";
import type { EmpresaGuardada } from "@/src/lib/empresa/servicio";
import { ROLES_EMPRESA } from "@/src/lib/empresa/validar";
import { NODOS_TECNOLOGIA } from "@/src/lib/tecnologia/taxonomia-v1";

const accion = async () => {};

const empresa: EmpresaGuardada = {
  id: "e1",
  razonSocial: "Acme Pumps GmbH",
  pais: "DE",
  registroEmpresarial: "HRB 1",
  sitioOficial: "https://acme.example",
  coberturaNacional: false,
  estadoVerificacion: "en_revision",
  atributos: {
    idiomas: { valor: ["es", "en"], estado: "declarado" },
    garantias: { valor: ["24 meses"], estado: "declarado" },
  },
  roles: [{ rol: "importador", estadoDato: "documentado" }],
  capacidades: [
    {
      nodoCodigo: "BOM.SUM",
      taxonomiaVersion: "x",
      estadoDato: "verificado",
      marcas: ["Acme", "Otra"],
      especificaciones: null,
    },
  ],
  cobertura: [
    { divipola: "76", estadoDato: "declarado" },
    { divipola: "05001", estadoDato: "declarado" },
  ],
  completitud: { completo: false, faltan: ["cobertura"], porcentaje: 80 },
};
const html = (props: Partial<Parameters<typeof PerfilEmpresaForm>[0]> = {}) =>
  renderToStaticMarkup(<PerfilEmpresaForm empresa={null} action={accion} {...props} />);

describe("PerfilEmpresaForm", () => {
  it("ofrece todos los roles, todas las categorías y los departamentos", () => {
    const h = html();
    for (const r of ROLES_EMPRESA) expect(h).toContain(`value="${r}"`);
    for (const n of NODOS_TECNOLOGIA) expect(h).toContain(`value="${n.codigo}"`);
    expect((h.match(/name="dpto"/g) ?? []).length).toBeGreaterThanOrEqual(30);
    expect(h).toMatch(/<form/);
    expect(h).toMatch(/Guardar perfil/);
  });

  it("no ofrece ningún campo de precio y lo advierte", () => {
    const h = html();
    expect(h).toMatch(/No subas listas de precios/);
    const nombres = [...h.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
    expect(nombres.some((n) => /precio|price|tarifa|costo|cotiz/i.test(n))).toBe(false);
  });

  it("no ofrece controles para fijar estados ni verificación", () => {
    const nombres = [...html({ empresa }).matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
    expect(nombres.some((n) => /estado|verific|usuario|empresaId/i.test(n))).toBe(false);
  });

  it("sin perfil: bilingüe, vacío y sin verificar", () => {
    const h = html();
    expect(h).toMatch(/Company profile/);
    expect(h).toMatch(/Legal name/);
    expect(h).toMatch(/sin verificar/);
  });

  it("con perfil: marca lo guardado, muestra el estado de cada dato con glifo y nombre", () => {
    const h = html({ empresa });
    expect(h).toMatch(/value="Acme Pumps GmbH"/);
    // El orden de los atributos lo decide React: se comprueba cada control por separado.
    const control = (valor: string) =>
      h.match(new RegExp(`<input[^>]*value="${valor}"[^>]*>`))?.[0] ?? "";
    expect(control("importador")).toMatch(/checked/);
    expect(control("consultora")).not.toMatch(/checked/);
    expect(control("BOM.SUM")).toMatch(/checked/);
    expect(control("76")).toMatch(/checked/);
    expect(control("05")).not.toMatch(/checked/);
    expect(h).toMatch(/◆ Documentado/);
    expect(h).toMatch(/✓ Verificado/);
    expect(h).toMatch(/value="Acme, Otra"/);
    expect(h).toMatch(/value="es, en"/);
    expect(h).toMatch(/en revisión/);
    expect(h).toMatch(/Perfil 80 %/);
    expect(h).toMatch(/Municipios ya declarados \(se conservan\): 05001/);
  });

  it("muestra el aviso de guardado y los errores con role correcto", () => {
    expect(html({ guardado: true })).toMatch(/role="status"[^>]*>✓ Perfil guardado/);
    const h = html({ errores: ["pais", "capacidades"] });
    expect(h).toMatch(/role="alert"/);
    expect(h).toMatch(/código ISO de 2 letras/);
    expect(h).toMatch(/no se admiten precios/);
  });

  it("cada control tiene su etiqueta asociada", () => {
    const h = html();
    for (const id of ["razonSocial", "pais", "sitioOficial", "attr-operacion"]) {
      expect(h).toMatch(new RegExp(`for="${id}"`));
    }
  });
});
