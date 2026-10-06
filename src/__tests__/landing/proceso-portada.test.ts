import { describe, expect, it } from "vitest";
import {
  departamentoCorto,
  estadoVisible,
  familiaDe,
  presupuestoCorto,
  presupuestoLargo,
  procesoPortadaDesdeFila,
  ubicacionDe,
  type FilaProcesoPortada,
} from "@/src/lib/landing/proceso-portada";

const fila: FilaProcesoPortada = {
  secopProcesoId: "CO1.REQ.123",
  referencia: "  0012-LP-2026 ",
  objeto: "OPTIMIZACIÓN DE LA PTAR MUNICIPAL",
  entidadNombre: "MUNICIPIO DE CHINÚ",
  estadoActual: "Publicado",
  estadoApertura: "Abierto",
  fechaRecepcion: "2099-12-31",
  tipoProyecto: "ptar",
  valorEstimado: "980000000.00",
  departamentoCodigo: "23",
  departamentoNombre: "Córdoba",
  municipioNombre: "Chinú",
};

describe("procesoPortadaDesdeFila", () => {
  it("separa identidad interna, número de proceso y ruta de la ficha", () => {
    const p = procesoPortadaDesdeFila(fila)!;
    expect(p.id).toBe("CO1.REQ.123");
    // Texto: conserva ceros iniciales, letras y guiones; solo se recorta el blanco.
    expect(p.numeroProceso).toBe("0012-LP-2026");
    expect(p.href).toBe("/licitaciones/optimizacion-de-la-ptar-municipal--CO1.REQ.123");
    expect(p.presupuesto).toBe(980_000_000);
    expect(p.moneda).toBe("COP");
    expect(p.ubicacion).toBe("entidad");
    expect(p.abierto).toBe(true);
  });

  it("excluye lo que no se puede mostrar ni enlazar", () => {
    for (const roto of [
      { referencia: null },
      { referencia: "   " },
      { objeto: "" },
      { secopProcesoId: null },
      { secopProcesoId: "abc-123" },
      { departamentoCodigo: null },
      { departamentoNombre: " " },
    ]) {
      expect(procesoPortadaDesdeFila({ ...fila, ...roto }), JSON.stringify(roto)).toBeNull();
    }
  });

  it("explica el acueducto de Chipatá cuando solo la descripción lo menciona", () => {
    const p = procesoPortadaDesdeFila({
      ...fila,
      secopProcesoId: "CO1.REQ.5720221",
      objeto: "CONSTRUCCION DE PAVIMENTO RIGIDO EN CHIPATA SANTANDER",
      descripcion:
        "MEJORAMIENTO DE VÍA MEDIANTE LA CONSTRUCCIÓN DE PAVIMENTO RÍGIDO Y RED DE ACUEDUCTO EN LA CALLE 4 ENTRE CARRERAS 4 Y 5 DEL MUNICIPIO DE CHIPATÁ, SANTANDER",
      tipoProyecto: "acueducto",
    })!;
    expect(p.contextoTipo).toBe("Según descripción: Acueducto.");
    expect(p.objeto).toBe("CONSTRUCCION DE PAVIMENTO RIGIDO EN CHIPATA SANTANDER");
    expect(p.href).toBe(
      "/licitaciones/construccion-de-pavimento-rigido-en-chipata-santander--CO1.REQ.5720221"
    );
    expect(p.tipoProyecto).toBe("acueducto");
  });

  it("no añade contexto si el objeto ya respalda el tipo", () => {
    expect(
      procesoPortadaDesdeFila({ ...fila, descripcion: "Construcción de PTAR" })!.contextoTipo
    ).toBeNull();
  });

  it("no inventa respaldo con descripción ausente o ajena al subsistema", () => {
    for (const descripcion of [
      null,
      "",
      "Construcción de pavimento rígido",
      "Construcción de alcantarillado",
    ]) {
      expect(
        procesoPortadaDesdeFila({
          ...fila,
          objeto: "Pavimentación",
          descripcion,
          tipoProyecto: "acueducto",
        })!.contextoTipo
      ).toBeNull();
    }
  });

  it("no usa la razón social como evidencia del tipo en la descripción", () => {
    expect(
      procesoPortadaDesdeFila({
        ...fila,
        objeto: "Imprimir facturas",
        descripcion: "Imprimir facturas para EMPRESA DE ACUEDUCTO Y ALCANTARILLADO DE CALI",
        entidadNombre: "EMPRESA DE ACUEDUCTO Y ALCANTARILLADO DE CALI",
        tipoProyecto: "acueducto",
      })!.contextoTipo
    ).toBeNull();
  });

  it("sin tipo conocido o con otros no afirma un subsistema en la descripción", () => {
    for (const tipoProyecto of [null, "otros", "riego"]) {
      expect(
        procesoPortadaDesdeFila({
          ...fila,
          objeto: "Obra",
          descripcion: "Red de acueducto",
          tipoProyecto,
        })!.contextoTipo
      ).toBeNull();
    }
  });

  it("presupuesto 0 o ausente no es un valor", () => {
    expect(procesoPortadaDesdeFila({ ...fila, valorEstimado: "0" })!.presupuesto).toBeNull();
    expect(procesoPortadaDesdeFila({ ...fila, valorEstimado: null })!.presupuesto).toBeNull();
  });

  it("«Abierto» solo con la regla de abierto; si no, el estado publicado", () => {
    const cerrado = procesoPortadaDesdeFila({
      ...fila,
      estadoApertura: "Cerrado",
      estadoActual: "Adjudicado",
    })!;
    expect(cerrado.abierto).toBe(false);
    expect(estadoVisible(cerrado)).toBe("Adjudicado");
    expect(estadoVisible({ abierto: false, estado: null })).toBe("Estado no disponible");
    expect(estadoVisible(procesoPortadaDesdeFila(fila)!)).toBe("Abierto");
  });

  it("sin recepción vigente no es abierto, aunque la fuente diga «Publicado / Abierto»", () => {
    expect(procesoPortadaDesdeFila({ ...fila, fechaRecepcion: null })!.abierto).toBe(false);
    expect(procesoPortadaDesdeFila({ ...fila, fechaRecepcion: undefined })!.abierto).toBe(false);
    expect(procesoPortadaDesdeFila({ ...fila, fechaRecepcion: "2020-01-01" })!.abierto).toBe(false);
  });

  it("la recepción cierra al final del día en Colombia", () => {
    const f = { ...fila, fechaRecepcion: "2026-10-05" };
    // 11:30 p. m. del 5 en Colombia (04:30 UTC del 6): todavía recibe ofertas.
    expect(procesoPortadaDesdeFila(f, new Date("2026-10-06T04:30:00Z"))!.abierto).toBe(true);
    // 12:30 a. m. del 6 en Colombia: ya no.
    expect(procesoPortadaDesdeFila(f, new Date("2026-10-06T05:30:00Z"))!.abierto).toBe(false);
  });

  it("un tipo desconocido no se convierte en una categoría", () => {
    expect(procesoPortadaDesdeFila({ ...fila, tipoProyecto: "riego" })!.tipoProyecto).toBeNull();
  });

  it("Bogotá no repite municipio y departamento; sin municipio, solo el departamento", () => {
    const bogota = procesoPortadaDesdeFila({
      ...fila,
      departamentoCodigo: "11",
      departamentoNombre: "Bogotá D.C.",
      municipioNombre: "BOGOTA D.C.",
    })!;
    expect(bogota.municipio).toBeNull();
    expect(ubicacionDe(bogota)).toBe("Bogotá D.C.");
    expect(ubicacionDe(procesoPortadaDesdeFila(fila)!)).toBe("Chinú · Córdoba");
    expect(ubicacionDe(procesoPortadaDesdeFila({ ...fila, municipioNombre: null })!)).toBe(
      "Córdoba"
    );
  });
});

describe("formatos", () => {
  it("presupuesto en millones, sin cero inventado", () => {
    expect(presupuestoLargo(2_450_000_000)).toBe("$2.450 millones");
    expect(presupuestoLargo(1_200_000)).toBe("$1 millón");
    expect(presupuestoLargo(null)).toBe("Presupuesto no disponible");
    expect(presupuestoCorto(2_450_000_000)).toBe("$2.450 M");
    expect(presupuestoCorto(980_000_000)).toBe("$980 M");
    expect(presupuestoCorto(null)).toBe("Sin presupuesto");
  });

  it("el archipiélago se acorta para la etiqueta del mapa", () => {
    expect(departamentoCorto("Archipiélago de San Andrés, Providencia y Santa Catalina")).toBe(
      "San Andrés"
    );
    expect(departamentoCorto("Norte de Santander")).toBe("Norte de Santander");
  });

  it("sin tipo, la familia neutra; nunca «redes»", () => {
    expect(familiaDe(null)).toBe("otros");
    expect(familiaDe("otros")).toBe("otros");
    expect(familiaDe("alcantarillado")).toBe("redes");
    expect(familiaDe("ptap")).toBe("potable");
    expect(familiaDe("ptar")).toBe("residual");
  });
});
