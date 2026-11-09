import { describe, it, expect } from "vitest";
import { completitud, validarEntradaEmpresa } from "@/src/lib/empresa/validar";

const base = {
  razonSocial: "  Acme Pumps GmbH ",
  pais: "de",
  roles: ["fabricante_internacional"],
  capacidades: [{ nodoCodigo: "BOM.SUM", marcas: ["Acme"] }],
  cobertura: ["76", "05001"],
};

function ok(entrada: unknown) {
  const r = validarEntradaEmpresa(entrada);
  if (!r.ok) throw new Error(`Esperaba ok y hubo errores: ${JSON.stringify(r.errores)}`);
  return r.valor;
}
const errores = (entrada: unknown) => {
  const r = validarEntradaEmpresa(entrada);
  return r.ok ? [] : r.errores.map((e) => `${e.campo}:${e.codigo}`);
};

describe("validarEntradaEmpresa", () => {
  it("normaliza: recorta, país en mayúsculas, sitio con https", () => {
    const v = ok({ ...base, sitioOficial: "https://acme.example/es" });
    expect(v.razonSocial).toBe("Acme Pumps GmbH");
    expect(v.pais).toBe("DE");
    expect(v.sitioOficial).toBe("https://acme.example/es");
  });

  it("solo toma los campos conocidos: ignora estados, ids y verificación enviados por el cliente", () => {
    const v = ok({
      ...base,
      usuarioId: "otro-usuario",
      empresaId: "x",
      estadoVerificacion: "verificada",
      roles: [{ rol: "importador", estadoDato: "verificado" }].map((r) => r.rol),
    }) as unknown as Record<string, unknown>;
    expect(v).not.toHaveProperty("usuarioId");
    expect(v).not.toHaveProperty("empresaId");
    expect(v).not.toHaveProperty("estadoVerificacion");
  });

  it("exige razón social y país ISO alfa-2", () => {
    expect(errores({ ...base, razonSocial: " " })).toContain("razonSocial:requerido");
    expect(errores({ ...base, pais: "DEU" })).toContain("pais:invalido");
    expect(errores({ ...base, pais: "1" })).toContain("pais:invalido");
    expect(errores({ ...base, razonSocial: "x".repeat(201) })).toContain(
      "razonSocial:demasiado_largo"
    );
  });

  it("el sitio oficial debe ser http(s)", () => {
    expect(errores({ ...base, sitioOficial: "javascript:alert(1)" })).toContain(
      "sitioOficial:invalido"
    );
    expect(errores({ ...base, sitioOficial: "no es url" })).toContain("sitioOficial:invalido");
  });

  it("roles: solo los del brief, sin repetidos", () => {
    expect(errores({ ...base, roles: ["vendedor_de_humo"] })).toContain("roles:invalido");
    expect(ok({ ...base, roles: ["importador", "importador"] }).roles).toEqual(["importador"]);
  });

  it("capacidades: el nodo debe existir en la taxonomía y no repetirse", () => {
    expect(errores({ ...base, capacidades: [{ nodoCodigo: "XXX" }] })).toContain(
      "capacidades:nodo_desconocido"
    );
    expect(
      ok({ ...base, capacidades: [{ nodoCodigo: "BOM" }, { nodoCodigo: "BOM" }] }).capacidades
    ).toHaveLength(1);
  });

  it("capacidades: rechaza listas de precios y cotizaciones en las especificaciones, a cualquier profundidad", () => {
    for (const clave of [
      "precio",
      "Precio_unitario",
      "price",
      "lista_de_precios",
      "costo",
      "cotizacion",
      "usd",
      "descuento",
    ]) {
      expect(
        errores({
          ...base,
          capacidades: [{ nodoCodigo: "BOM", especificaciones: { [clave]: 10 } }],
        }),
        clave
      ).toContain("capacidades:precio_no_permitido");
    }
    expect(
      errores({
        ...base,
        capacidades: [{ nodoCodigo: "BOM", especificaciones: { a: { b: { price: 1 } } } }],
      })
    ).toContain("capacidades:precio_no_permitido");
    expect(
      errores({
        ...base,
        capacidades: [{ nodoCodigo: "BOM", especificaciones: { caudal_max_m3h: 120 } }],
      })
    ).toEqual([]);
  });

  it("capacidades: acota el tamaño de las especificaciones", () => {
    const grande = { notas: "x".repeat(5000) };
    expect(
      errores({ ...base, capacidades: [{ nodoCodigo: "BOM", especificaciones: grande }] })
    ).toContain("capacidades:demasiado_grande");
  });

  it("cobertura: DIVIPOLA de 2 o 5 dígitos", () => {
    expect(errores({ ...base, cobertura: ["7"] })).toContain("cobertura:invalido");
    expect(errores({ ...base, cobertura: ["760"] })).toContain("cobertura:invalido");
    expect(ok({ ...base, cobertura: ["76", "76"] }).cobertura).toEqual(["76"]);
  });

  it("atributos: solo claves conocidas, valores acotados y sin precios", () => {
    const v = ok({ ...base, atributos: { idiomas: ["es", "en"], monedas: "USD" } });
    expect(v.atributos).toEqual({ idiomas: ["es", "en"], monedas: ["USD"] });
    expect(errores({ ...base, atributos: { lista_de_precios: "x" } })).toContain(
      "atributos:clave_desconocida"
    );
    expect(errores({ ...base, atributos: { garantias: "x".repeat(501) } })).toContain(
      "atributos:demasiado_largo"
    );
  });

  it("una entrada que no es un objeto falla sin lanzar", () => {
    for (const x of [null, undefined, 5, "texto", []]) {
      expect(errores(x)).toContain("entrada:invalido");
    }
  });
});

describe("completitud", () => {
  it("lista lo que falta para que el perfil sirva al matching", () => {
    expect(completitud({ ...ok(base), cobertura: [], coberturaNacional: false }).faltan).toEqual([
      "cobertura",
    ]);
    expect(completitud(ok(base))).toEqual({ completo: true, faltan: [], porcentaje: 100 });
    const vacio = ok({ razonSocial: "X", pais: "US" });
    expect(completitud(vacio).faltan).toEqual(["roles", "capacidades", "cobertura"]);
    expect(completitud(vacio).porcentaje).toBeLessThan(100);
  });

  it("la cobertura nacional cuenta como cobertura", () => {
    expect(completitud(ok({ ...base, cobertura: [], coberturaNacional: true })).faltan).toEqual([]);
  });
});
