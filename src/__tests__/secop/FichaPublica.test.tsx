import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProcesoFicha } from "@/src/lib/secop/ficha";
import type { PliegoFicha } from "@/src/lib/secop/pliego-ficha";

const datos = vi.hoisted(() => ({
  proceso: vi.fn(),
  pliego: vi.fn(),
  competidores: vi.fn(),
  contratos: vi.fn(),
}));
vi.mock("@/src/lib/secop/ficha", async (original) => ({
  ...(await original<object>()),
  procesoPorSlug: datos.proceso,
  competidoresComparables: datos.competidores,
  contratosDeProceso: datos.contratos,
}));
vi.mock("@/src/lib/secop/pliego-ficha", () => ({ pliegoDeProceso: datos.pliego }));
vi.mock("@/src/lib/secop/pliego-actions", () => ({ subirPliegoDesdeFichaAction: vi.fn() }));

import FichaPage, { generateStaticParams, revalidate } from "@/app/licitaciones/[slug]/page";

const proceso: ProcesoFicha = {
  id: "uuid-proceso",
  secopProcesoId: "CO1.REQ.42",
  referencia: "LP-42",
  objeto: "MEJORAMIENTO DEL ACUEDUCTO",
  descripcion: "Reposición de redes según anexo técnico.",
  modalidad: "Licitación pública",
  tipoContrato: "Obra",
  unspsc: "V1.831015",
  estadoActual: "Publicado",
  estadoApertura: "Abierto",
  fechaPublicacion: "2026-09-01T12:00:00Z",
  // Recibe ofertas: recepción vigente (spec 2026-10-05, M9).
  fechaRecepcion: "2099-12-31",
  valorEstimado: "4250000000",
  documentAccess: "UNKNOWN",
  url: "https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.42",
  tipoProyecto: "acueducto",
  entidadNombre: "Alcaldía de prueba",
  entidadNit: "123456",
  departamento: "Antioquia",
  departamentoCodigo: "05",
  municipio: "Medellín",
  adjudicado: false,
  adjudicatario: null,
  fechaAdjudicacion: null,
};
const pliego: PliegoFicha = {
  nombreArchivo: "base.pdf",
  actualizado: "2026-09-27T12:00:00Z",
  consistente: true,
  confianza: "alta",
  presupuestoOficialCop: 4200000000,
  fechaCierre: "20 de octubre de 2026",
  requisitos: [
    {
      clave: "experiencia_especifica",
      etiqueta: "Experiencia específica",
      texto: "Dos contratos de acueducto",
    },
  ],
  causales: [],
  cronograma: [{ hito: "Cierre de propuestas", fecha: "20 de octubre de 2026" }],
  capitulos: [{ nombre: "Red principal", items: 3, total: 9000000 }],
  lagunas: [],
  origen: { requisitos: "reglas", causales: "reglas", capitulos: "llm" },
};
async function html() {
  return renderToStaticMarkup(
    await FichaPage({ params: Promise.resolve({ slug: "acueducto--CO1.REQ.42" }) })
  );
}

describe("Ficha pública para explorar desde el celular", () => {
  beforeEach(() => {
    datos.proceso.mockResolvedValue(proceso);
    datos.pliego.mockResolvedValue(null);
    datos.competidores.mockResolvedValue([]);
    datos.contratos.mockResolvedValue([]);
  });
  it("ofrece las seis preguntas del boceto y conserva el acceso para empresas", async () => {
    const salida = await html();
    for (const id of [
      "resumen",
      "proposito",
      "dinero",
      "plazos",
      "responsables",
      "metas",
      "participar",
    ]) {
      expect(salida).toContain(`aria-controls="ficha-${id}"`);
      expect(salida).toContain(`id="ficha-${id}"`);
    }
    expect(salida).toContain("Quiero participar");
    // El bloque de decisión (PR #95) sustituye al semáforo dentro de Participar.
    expect(salida).toContain("¿Es para ti?");
    expect(salida).toMatch(/<button[^>]*class="fd-cta"[^>]*>Define tu perfil<\/button>/);
    expect(salida).toContain('name="file"');
    expect(salida).toContain('id="pliego"');
  });
  it("sirve todo el contenido sin JavaScript y conserva la caché pública", async () => {
    const salida = await html();
    expect(salida).toContain("Reposición de redes según anexo técnico.");
    expect(salida).not.toMatch(/<section[^>]*hidden/);
    expect(revalidate).toBe(43200);
    expect(await generateStaticParams()).toEqual([]);
  });
  it("distingue la ubicación de la entidad y no inventa ejecución, metas ni financiación", async () => {
    const salida = await html();
    expect(salida).toContain("Entidad en Medellín, Antioquia");
    expect(salida).toContain("Lugar de ejecución por confirmar");
    expect(salida).toContain("Origen de los recursos por verificar");
    expect(salida).toContain("Metas pendientes de verificar");
    expect(salida).not.toContain("Obra sin iniciar");
    expect(salida).not.toContain("180 viviendas");
    expect(salida).not.toContain('"areaServed"');
  });
  it("un presupuesto ausente o cero no se convierte en una obra gratuita", async () => {
    datos.proceso.mockResolvedValue({
      ...proceso,
      valorEstimado: "0",
      fechaPublicacion: "fecha inválida",
      url: null,
    });
    const salida = await html();
    expect(salida).toContain("Presupuesto por confirmar");
    expect(salida).not.toContain("Invalid Date");
    expect(salida).not.toContain('href="null"');
  });
  it("conserva el día de calendario de las columnas DATE de SECOP", async () => {
    datos.proceso.mockResolvedValue({
      ...proceso,
      fechaPublicacion: "2026-09-26",
      fechaRecepcion: "2026-10-20",
    });
    const salida = await html();
    expect(salida).toContain("26 de septiembre de 2026");
    expect(salida).toContain("20 de octubre de 2026");
  });
  it("cerrado a ofertas: la etapa es «En evaluación» y no invita a ofertar", async () => {
    datos.proceso.mockResolvedValue({ ...proceso, estadoApertura: "Cerrado" });
    const salida = await html();
    expect(salida).toContain("En evaluación");
    expect(salida).toContain("Este proceso no recibe ofertas ahora");
    expect(salida).toContain("Explorar procesos que reciben ofertas");
    expect(salida).not.toContain("¿Es para ti?");
  });

  it("«Publicado / Abierto» sin fecha de recepción no se presenta como abierto", async () => {
    datos.proceso.mockResolvedValue({ ...proceso, fechaRecepcion: null });
    const salida = await html();
    expect(salida).toContain("Por verificar");
    expect(salida).not.toContain("Abierto a ofertas");
    expect(salida).not.toContain("¿Es para ti?");
  });

  it("con contrato en ejecución: lo dice, señala la contradicción y no inventa avance", async () => {
    datos.proceso.mockResolvedValue({
      ...proceso,
      estadoActual: "Abierto",
      estadoApertura: null,
      fechaRecepcion: null,
      referencia: "4182.010.32.1.327-2026 (Presentación de oferta)",
    });
    datos.contratos.mockResolvedValue([
      {
        fechaFirma: "2026-09-09",
        fechaInicio: "2026-09-29",
        fechaFinInicial: "2099-12-31",
        fechaFinActual: "2099-12-31",
        valorInicial: "400000000",
        valorActual: "400000000",
        estado: "En ejecución",
      },
    ]);
    const salida = await html();
    expect(salida).toContain("En ejecución");
    expect(salida).toContain("Según las fechas del contrato");
    expect(salida).toContain("Revisa antes de confiar");
    expect(salida).toContain("9 sep 2026");
    expect(salida).toContain("4182.010.32.1.327-2026");
    expect(salida).not.toContain("(Presentación de oferta)");
    expect(salida).not.toContain("¿Es para ti?");
  });
  it("conserva los datos del pliego y distingue su presupuesto del publicado en SECOP", async () => {
    datos.pliego.mockResolvedValue(pliego);
    const salida = await html();
    expect(salida).toContain("Dos contratos de acueducto");
    expect(salida).toContain("Red principal");
    expect(salida).toContain("Cierre de propuestas");
    expect(salida).toContain("20 de octubre de 2026");
    expect(salida).toContain("4.250.000.000");
    expect(salida).toContain("4.200.000.000");
    expect(salida).toContain("Procesar y reemplazar");
  });
  it("el objeto externo no puede cerrar el JSON-LD e inyectar HTML", async () => {
    datos.proceso.mockResolvedValue({
      ...proceso,
      objeto: '</script><script>alert("objeto")</script>',
    });
    const salida = await html();
    expect(salida).not.toContain("</script><script>alert");
  });
});
