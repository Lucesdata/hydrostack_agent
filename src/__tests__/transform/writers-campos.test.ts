import { describe, it, expect } from "vitest";
import { mapProcesoRow, mapContratoRow } from "@/src/lib/transform/mapCanonical";

/**
 * Contrato estructural: toda propiedad promovida de la proyección tiene que
 * tener una columna en el INSERT. Sin este test, añadir un campo a la
 * proyección y olvidarlo en el writer pasa desapercibido — la columna queda
 * NULL en silencio y el fallback al payload lo tapa hasta que el payload se va.
 */
const PROMOVIDOS_PROCESO = [
  "descripcion", "url", "unspsc", "fase", "adjudicado", "valorAdjudicacion",
  "adjudicatario", "nitAdjudicatario", "fechaAdjudicacion", "estadoApertura",
  "fechaRecepcion",
] as const;

const PROMOVIDOS_CONTRATO = ["unspsc", "url"] as const;

describe("proyecciones promovidas", () => {
  it("mapProcesoRow expone las 11 propiedades promovidas", () => {
    const p = mapProcesoRow({ id_del_proceso: "CO1.REQ.1" });
    for (const k of PROMOVIDOS_PROCESO) expect(p).toHaveProperty(k);
  });

  it("mapContratoRow expone las 2 propiedades promovidas", () => {
    const c = mapContratoRow({ id_contrato: "CO1.PCCNTR.1" });
    for (const k of PROMOVIDOS_CONTRATO) expect(c).toHaveProperty(k);
  });
});
