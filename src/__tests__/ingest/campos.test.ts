import { describe, it, expect } from "vitest";
import { camposDe, selectDe } from "@/src/lib/ingest/campos";
import { FIELDS_PROCESOS, FIELDS_CONTRATOS } from "@/src/lib/secop/config";
import { SOURCE_PROCESOS, SOURCE_CONTRATOS } from "@/src/lib/ingest/sources";

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

  it("incluye los campos que el transform consume y no están en FIELDS_*", () => {
    const p = camposDe("secop_ii_procesos");
    for (const f of ["id_del_portafolio", "id_estado_del_procedimiento", "ordenentidad"]) {
      expect(p).toContain(f);
    }
    const c = camposDe("secop_ii_contratos");
    for (const f of ["proceso_de_compra", "localizaci_n", "es_grupo", "orden", "rama",
                     "sector", "tipodocproveedor", "nombre_representante_legal",
                     "descripcion_del_proceso"]) {
      expect(c).toContain(f);
    }
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
