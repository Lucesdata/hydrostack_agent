import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FichaComercial from "@/src/components/comercial/FichaComercial";
import {
  armarFichaComercial,
  type FilaContratoComercial,
} from "@/src/lib/comercial/ficha-contrato";

const fila = (extra: Partial<FilaContratoComercial> = {}): FilaContratoComercial => ({
  secopContratoId: "CO1.PCCNTR.1",
  objeto: "Suministro de bombas sumergibles",
  url: "https://example.test/c",
  estadoActual: "En ejecución",
  valorInicial: "1000.00",
  valorActual: "1500.00",
  fechaFirma: "2026-03-14",
  fechaInicio: null,
  fechaFinActual: "2026-09-30",
  entidadNombre: "Municipio de Ejemplo",
  municipio: "Zarzal",
  departamento: "Valle del Cauca",
  tipoProyecto: "ptar",
  proveedorRazonSocial: "Consorcio Ficticio 1",
  proveedorTipoDocumento: "NIT",
  proveedorNit: "900000001",
  proveedorNitDv: "0",
  proveedorPlural: true,
  ...extra,
});
const html = (f = fila()) =>
  renderToStaticMarkup(<FichaComercial ficha={armarFichaComercial(f, "2026-06-01")} />);

describe("FichaComercial", () => {
  it("avisa que el estado administrativo no indica avance físico ni compras pendientes", () => {
    expect(html()).toMatch(/No indica avance físico/);
    expect(html()).toMatch(/no demuestra una compra pendiente/);
  });

  it("el estado nunca va solo en color: lleva glifo y nombre", () => {
    const h = html();
    expect(h).toMatch(/▶ En ejecución/);
    expect(h).toMatch(/○ Inferida/);
  });

  it("las necesidades traen cita, evidencia y «sin dato» en cantidad, especificaciones y fecha", () => {
    const h = html();
    expect(h).toMatch(/bombas sumergibles/);
    expect((h.match(/sin dato/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(h).toMatch(/Cantidad/);
  });

  it("integrantes del consorcio: «sin dato oficial»", () => {
    expect(html()).toMatch(/Sin dato oficial/);
  });

  it("reserva la sección de Talent Intelligence con el texto fijo", () => {
    expect(html()).toMatch(/Talent Intelligence/);
    expect(html()).toMatch(/no equivalen a ofertas de empleo/);
  });

  it("un contratista que es persona natural no aparece", () => {
    const h = html(
      fila({
        proveedorTipoDocumento: "CC",
        proveedorRazonSocial: "Juan Pérez",
        proveedorNit: "123",
      })
    );
    expect(h).not.toMatch(/Juan/);
    expect(h).toMatch(/no se nombra/);
  });

  it("sin menciones lo dice y no inventa necesidades", () => {
    const h = html(fila({ objeto: "Contratación de papelería" }));
    expect(h).toMatch(/no menciona bienes/);
    expect(h).not.toMatch(/○ Inferida/); // el chip de una necesidad; la nota explicativa sí nombra el término
    expect(h).not.toMatch(/Evidencia/);
  });

  it("no expone representantes legales ni nombres de supervisores", () => {
    expect(html()).not.toMatch(/representante legal|supervisor|ordenador/i);
  });

  it("el enlace a SECOP abre en pestaña nueva sin filtrar el origen", () => {
    expect(html()).toMatch(/rel="noopener noreferrer"/);
  });
});
