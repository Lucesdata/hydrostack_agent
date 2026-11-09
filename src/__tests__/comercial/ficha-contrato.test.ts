import { describe, expect, it } from "vitest";
import {
  armarFichaComercial,
  hoyEnColombia,
  PATRON_ID_CONTRATO,
  type FilaContratoComercial,
} from "@/src/lib/comercial/ficha-contrato";
import { comercialHabilitado } from "@/src/lib/comercial/habilitado";

const fila = (extra: Partial<FilaContratoComercial> = {}): FilaContratoComercial => ({
  secopContratoId: "CO1.PCCNTR.1",
  objeto: "Suministro de bombas sumergibles para la estación de rebombeo",
  url: "https://example.test/contrato",
  estadoActual: "En ejecución",
  valorInicial: "1000000.00",
  valorActual: "1250000.00",
  fechaFirma: "2026-03-14",
  fechaInicio: "2026-03-20",
  fechaFinActual: "2026-09-30",
  entidadNombre: "Municipio de Ejemplo",
  municipio: "Zarzal",
  departamento: "Valle del Cauca",
  tipoProyecto: "alcantarillado",
  proveedorRazonSocial: "Consorcio Ficticio 1",
  proveedorTipoDocumento: "NIT",
  proveedorNit: "900000001",
  proveedorNitDv: "0",
  proveedorPlural: true,
  ...extra,
});

describe("armarFichaComercial", () => {
  it("nombra al contratista solo si el documento es NIT, con su dígito de verificación", () => {
    const f = armarFichaComercial(fila(), "2026-06-01");
    expect(f.contratista).toEqual({
      visible: true,
      nombre: "Consorcio Ficticio 1",
      nit: "900000001-0",
      estructuraPlural: true,
    });
  });

  it("persona natural o documento desconocido: no se nombra ni se expone el documento", () => {
    for (const tipo of ["CC", "CE", "PASAPORTE", "OTRO", null]) {
      const f = armarFichaComercial(
        fila({
          proveedorTipoDocumento: tipo,
          proveedorRazonSocial: "Juan Pérez",
          proveedorNit: "123",
        }),
        "2026-06-01"
      );
      expect(f.contratista.visible).toBe(false);
      expect(JSON.stringify(f)).not.toContain("Juan");
      expect(JSON.stringify(f)).not.toContain("123");
    }
  });

  it("sin contratista resuelto lo dice distinto a «no se nombra»", () => {
    const f = armarFichaComercial(
      fila({ proveedorRazonSocial: null, proveedorTipoDocumento: null, proveedorNit: null }),
      "2026-06-01"
    );
    expect(f.tieneContratista).toBe(false);
  });

  it("infiere necesidades con su cita literal, estado inferida y evidencia C, sin cantidades", () => {
    const f = armarFichaComercial(fila(), "2026-06-01");
    const n = f.necesidades.find((x) => x.codigo === "BOM.SUM");
    expect(n).toMatchObject({
      estado: "inferida",
      calidadEvidencia: "C",
      cita: "bombas sumergibles",
    });
    expect(Object.keys(n ?? {}).some((k) => /cantidad|precio|fecha/i.test(k))).toBe(false);
  });

  it("una negación no produce necesidad", () => {
    const f = armarFichaComercial(
      fila({ objeto: "El contrato no incluye el suministro de bombas sumergibles" }),
      "2026-06-01"
    );
    expect(f.necesidades).toEqual([]);
  });

  it("vigencia por fecha fin frente al día de hoy; sin fecha no se afirma", () => {
    expect(armarFichaComercial(fila(), "2026-09-30").vigente).toBe(true);
    expect(armarFichaComercial(fila(), "2026-10-01").vigente).toBe(false);
    expect(armarFichaComercial(fila({ fechaFinActual: null }), "2026-06-01").vigente).toBeNull();
  });

  it("los valores en cero o ausentes son «sin dato», no $0", () => {
    const f = armarFichaComercial(fila({ valorActual: "0.00", valorInicial: null }), "2026-06-01");
    expect(f.valorActual).toBeNull();
    expect(f.valorInicial).toBeNull();
  });

  it("la ubicación es la sede de la entidad", () => {
    expect(armarFichaComercial(fila(), "2026-06-01").ubicacionEntidad).toBe(
      "Zarzal, Valle del Cauca"
    );
    expect(
      armarFichaComercial(fila({ municipio: null, departamento: null }), "2026-06-01")
        .ubicacionEntidad
    ).toBeNull();
  });
});

describe("id del contrato", () => {
  it("solo ids nativos de SECOP II", () => {
    expect(PATRON_ID_CONTRATO.test("CO1.PCCNTR.9821680")).toBe(true);
    for (const malo of [
      "",
      "CO1.REQ.1",
      "CO1.PCCNTR.",
      "CO1.PCCNTR.1; drop table",
      "../etc/passwd",
      "CO1.PCCNTR.1234567890123",
    ]) {
      expect(PATRON_ID_CONTRATO.test(malo)).toBe(false);
    }
  });
});

describe("hoyEnColombia", () => {
  it("usa el día de Colombia, no el de UTC", () => {
    expect(hoyEnColombia(new Date("2026-07-01T03:00:00Z"))).toBe("2026-06-30"); // 22:00 del 30 en Bogotá
    expect(hoyEnColombia(new Date("2026-07-01T06:00:00Z"))).toBe("2026-07-01");
  });
});

describe("bandera CI_COMERCIAL_HABILITADO", () => {
  it("apagada por defecto y solo con «1»", () => {
    expect(comercialHabilitado({})).toBe(false);
    for (const v of ["0", "true", "yes", "", "2"])
      expect(comercialHabilitado({ CI_COMERCIAL_HABILITADO: v })).toBe(false);
    expect(comercialHabilitado({ CI_COMERCIAL_HABILITADO: "1" })).toBe(true);
  });
});
