import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { camposDe, selectDe } from "@/src/lib/ingest/campos";
import { FIELDS_PROCESOS, FIELDS_CONTRATOS } from "@/src/lib/secop/config";
import { SOURCE_PROCESOS, SOURCE_CONTRATOS } from "@/src/lib/ingest/sources";

/**
 * Extrae las claves `row["..."]` que lee el cuerpo de una función exportada
 * de mapCanonical.ts. El cuerpo corre hasta el siguiente `export function`
 * (o fin de archivo), así que los helpers no exportados que vienen después
 * de `mapContratoRow` (`geoFromContrato`, `parseLocalizacion`) quedan dentro
 * de SU cuerpo — son helpers de contratos, sus claves cuentan como de
 * contratos. Esto reemplaza una lista de campos escrita a mano: se deriva
 * directamente del código, así que detecta un campo nuevo leído por nombre
 * aunque nadie se acuerde de añadirlo a ninguna lista (Finding 1: dos claves
 * que mapContratoRow leía sin estar en FIELDS_CONTRATOS ni en EXTRA_CONTRATOS
 * y que este mecanismo habría detectado).
 */
function clavesLeidasPor(nombreFuncion: string, texto: string): string[] {
  const inicio = texto.indexOf(`export function ${nombreFuncion}`);
  if (inicio < 0) {
    throw new Error(`no encuentro "export function ${nombreFuncion}" en mapCanonical.ts`);
  }
  const resto = texto.slice(inicio);
  const siguienteExport = resto.indexOf("\nexport function ", 1);
  const cuerpo = siguienteExport < 0 ? resto : resto.slice(0, siguienteExport);
  const claves = new Set<string>();
  for (const m of cuerpo.matchAll(/row\[["']([^"']+)["']\]/g)) claves.add(m[1]);
  return [...claves];
}

const mapCanonicalSrc = readFileSync("src/lib/transform/mapCanonical.ts", "utf8");

describe("camposDe", () => {
  it("incluye todos los campos de FIELDS_PROCESOS", () => {
    const campos = camposDe("secop_ii_procesos");
    for (const f of Object.values(FIELDS_PROCESOS)) expect(campos).toContain(f);
  });

  it("incluye todos los campos de FIELDS_CONTRATOS", () => {
    const campos = camposDe("secop_ii_contratos");
    for (const f of Object.values(FIELDS_CONTRATOS)) expect(campos).toContain(f);
  });

  it("incluye el watermark, sin el cual el incremental no avanza", () => {
    expect(camposDe("secop_ii_procesos")).toContain(SOURCE_PROCESOS.watermarkField);
    expect(camposDe("secop_ii_contratos")).toContain(SOURCE_CONTRATOS.watermarkField);
  });

  it("cubre toda clave row[...] que mapProcesoRow lee, derivado de mapCanonical.ts (no a mano)", () => {
    const leidas = clavesLeidasPor("mapProcesoRow", mapCanonicalSrc);
    // Guarda contra que el parser se rompa en silencio y la lista quede vacía.
    expect(leidas.length).toBeGreaterThan(15);
    const campos = camposDe("secop_ii_procesos");
    for (const clave of leidas) expect(campos).toContain(clave);
  });

  it("cubre toda clave row[...] que mapContratoRow lee (incluye sus helpers de geografía), derivado de mapCanonical.ts (no a mano)", () => {
    const leidas = clavesLeidasPor("mapContratoRow", mapCanonicalSrc);
    expect(leidas.length).toBeGreaterThan(15);
    const campos = camposDe("secop_ii_contratos");
    for (const clave of leidas) expect(campos).toContain(clave);
  });

  it("no tiene duplicados", () => {
    const c = camposDe("secop_ii_procesos");
    expect(new Set(c).size).toBe(c.length);
  });

  it("selectDe produce una lista separada por comas sin espacios", () => {
    const s = selectDe("secop_ii_procesos");
    expect(s).not.toContain(" ");
    expect(s.split(",")).toEqual(camposDe("secop_ii_procesos"));
  });
});
