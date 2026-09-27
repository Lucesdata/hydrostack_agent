import { describe, it, expect, vi, beforeEach } from "vitest";

const insertValuesMock = vi.fn();
const onConflictMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/src/lib/db/client", () => ({
  db: {
    insert: () => ({
      values: (...args: unknown[]) => {
        insertValuesMock(...args);
        return { onConflictDoUpdate: (...cArgs: unknown[]) => onConflictMock(...cArgs) };
      },
    }),
  },
}));

const recordUserSignalMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/src/lib/signals/record-signal", () => ({
  recordUserSignal: (...args: unknown[]) => recordUserSignalMock(...args),
}));

const extractPliegoHybridMock = vi.fn();
vi.mock("@/src/lib/pliego/extractPliegoHybrid", () => ({
  extractPliegoHybrid: (...args: unknown[]) => extractPliegoHybridMock(...args),
}));

const extractStructuredMock = vi.fn();
vi.mock("@/src/lib/eligibility/extract-requirements", () => ({
  extractStructuredRequirements: (...args: unknown[]) => extractStructuredMock(...args),
}));

import { uploadPliego } from "@/src/lib/secop/pliego-upload";
import { NO_ENCONTRADO, type PliegoExtraction } from "@/src/lib/pliego/schema";

function extraccion(over: Partial<PliegoExtraction> = {}): PliegoExtraction {
  return {
    proceso: "P-1",
    entidad: "E",
    objeto_contrato: NO_ENCONTRADO,
    modalidad_contratacion: NO_ENCONTRADO,
    fecha_publicacion: NO_ENCONTRADO,
    fecha_cierre: "2026-09-01",
    presupuesto_oficial_cop: 1000,
    moneda: "COP",
    capitulos: [
      {
        nombre: "Cap A",
        items: [
          {
            codigo: "1",
            descripcion: "x",
            unidad: "GLB",
            cantidad: 1,
            valor_unitario: 1000,
            valor_total: 1000,
            cita_textual: "cita",
          },
        ],
      },
    ],
    reglas_presupuesto: [],
    requisitos_habilitantes: {
      experiencia_especifica: NO_ENCONTRADO,
      capacidad_financiera: NO_ENCONTRADO,
      capacidad_organizacional: NO_ENCONTRADO,
    },
    cronograma: [],
    verificacion: {
      campos_no_encontrados: [],
      confianza_general: "alta",
      justificacion_confianza: "ok",
    },
    lagunas_pendientes: [],
    ...over,
  };
}

const PDF_BUFFER = Buffer.from("%PDF-1.7\nfake");
const ORIGEN_LLM = {
  reglas_presupuesto: "llm" as const,
  requisitos_habilitantes: "llm" as const,
  capitulos: "llm" as const,
};

describe("uploadPliego", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza un archivo que no es PDF sin llamar al extractor", async () => {
    const r = await uploadPliego({
      procesoId: "CO1.REQ.1",
      subidoPorUsuarioId: "u1",
      nombreArchivo: "x.txt",
      buffer: Buffer.from("no soy un pdf"),
    });
    expect(r.ok).toBe(false);
    // NOTA: `r.ok === false` en vez de `!r.ok` — con TypeScript 6.0.3 la
    // negación no angosta este union discriminado cuando `r` viene del
    // valor de retorno de una función real (repro aislado confirmado);
    // la comparación explícita sí angosta correctamente.
    if (r.ok === false) expect(r.error).toContain("PDF válido");
    expect(extractPliegoHybridMock).not.toHaveBeenCalled();
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("persiste con gateMatematicoPasado:true cuando la extracción es consistente", async () => {
    extractPliegoHybridMock.mockResolvedValueOnce({ extraction: extraccion(), origen: ORIGEN_LLM });

    const r = await uploadPliego({
      procesoId: "CO1.REQ.1",
      subidoPorUsuarioId: "u1",
      nombreArchivo: "pliego.pdf",
      buffer: PDF_BUFFER,
    });

    expect(r).toEqual({ ok: true, gateMatematicoPasado: true });
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        procesoId: "CO1.REQ.1",
        subidoPorUsuarioId: "u1",
        nombreArchivo: "pliego.pdf",
        gateMatematicoPasado: true,
      })
    );
    expect(onConflictMock).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.anything(),
        set: expect.objectContaining({
          subidoPorUsuarioId: "u1",
          nombreArchivo: "pliego.pdf",
          gateMatematicoPasado: true,
        }),
      })
    );
    const onConflictCall = onConflictMock.mock.calls[0][0];
    expect(onConflictCall.set).not.toHaveProperty("createdAt");
    expect(recordUserSignalMock).toHaveBeenCalledWith("u1", "estructurador");
  });

  it("persiste con gateMatematicoPasado:false cuando la aritmética no cuadra", async () => {
    const inconsistente = extraccion();
    inconsistente.capitulos[0].items[0].valor_total = 9999;
    extractPliegoHybridMock.mockResolvedValueOnce({
      extraction: inconsistente,
      origen: ORIGEN_LLM,
    });

    const r = await uploadPliego({
      procesoId: "CO1.REQ.1",
      subidoPorUsuarioId: "u1",
      nombreArchivo: "pliego.pdf",
      buffer: PDF_BUFFER,
    });

    expect(r).toEqual({ ok: true, gateMatematicoPasado: false });
  });

  it("devuelve error si extractPliegoHybrid lanza, sin persistir", async () => {
    extractPliegoHybridMock.mockRejectedValueOnce(new Error("Gemini no disponible"));

    const r = await uploadPliego({
      procesoId: "CO1.REQ.1",
      subidoPorUsuarioId: "u1",
      nombreArchivo: "pliego.pdf",
      buffer: PDF_BUFFER,
    });

    expect(r).toEqual({ ok: false, error: "Extracción falló: Gemini no disponible" });
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("rechaza un archivo > 20MB sin persistir", async () => {
    // Create a buffer larger than MAX_BYTES_PDF (20MB)
    // Must start with valid PDF magic bytes "%PDF-" so it passes isPdfBuffer check
    const bigBuffer = Buffer.alloc(21 * 1024 * 1024); // 21MB
    // Write "%PDF-" at the start
    Buffer.from("%PDF-").copy(bigBuffer, 0);

    const r = await uploadPliego({
      procesoId: "CO1.REQ.1",
      subidoPorUsuarioId: "u1",
      nombreArchivo: "big.pdf",
      buffer: bigBuffer,
    });

    expect(r).toEqual({ ok: false, error: expect.stringContaining("supera el máximo") });
    expect(extractPliegoHybridMock).not.toHaveBeenCalled();
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("pasa el Formulario 1 al extractor y rechaza uno de más de 10 MB", async () => {
    extractPliegoHybridMock.mockResolvedValueOnce({ extraction: extraccion(), origen: ORIGEN_LLM });
    const xls = Buffer.from("xls");
    await uploadPliego({
      procesoId: "CO1.REQ.1",
      subidoPorUsuarioId: "u1",
      nombreArchivo: "pliego.pdf",
      buffer: PDF_BUFFER,
      formulario1: xls,
    });
    expect(extractPliegoHybridMock).toHaveBeenCalledWith(PDF_BUFFER, { formulario1: xls });

    const r = await uploadPliego({
      procesoId: "CO1.REQ.1",
      subidoPorUsuarioId: "u1",
      nombreArchivo: "pliego.pdf",
      buffer: PDF_BUFFER,
      formulario1: Buffer.alloc(11 * 1024 * 1024),
    });
    expect(r).toEqual({ ok: false, error: expect.stringContaining("Formulario 1") });
  });

  describe("requisitos habilitantes → requisitos_proceso", () => {
    const conRequisitos = () =>
      extraccion({
        requisitos_habilitantes: {
          experiencia_especifica: "Dos contratos de acueducto por 100% del presupuesto",
          capacidad_financiera: NO_ENCONTRADO,
          capacidad_organizacional: NO_ENCONTRADO,
        },
      });
    const subir = () =>
      uploadPliego({
        procesoId: "CO1.REQ.7",
        subidoPorUsuarioId: "u1",
        nombreArchivo: "pliego.pdf",
        buffer: PDF_BUFFER,
      });

    it("si el pliego declara alguno, los estructura y los cachea por proceso", async () => {
      extractPliegoHybridMock.mockResolvedValueOnce({
        extraction: conRequisitos(),
        origen: ORIGEN_LLM,
      });
      const estructurados = { experiencia: { minContratos: 2 } };
      extractStructuredMock.mockResolvedValueOnce(estructurados);

      expect((await subir()).ok).toBe(true);
      expect(extractStructuredMock).toHaveBeenCalledWith(conRequisitos().requisitos_habilitantes);
      expect(insertValuesMock).toHaveBeenCalledWith({
        procesoId: "CO1.REQ.7",
        requisitos: estructurados,
      });
    });

    it("si no declara ninguno, no llama al modelo", async () => {
      extractPliegoHybridMock.mockResolvedValueOnce({
        extraction: extraccion(),
        origen: ORIGEN_LLM,
      });
      await subir();
      expect(extractStructuredMock).not.toHaveBeenCalled();
      expect(insertValuesMock).toHaveBeenCalledTimes(1);
    });

    it("si la estructuración falla, la subida sigue siendo un éxito", async () => {
      extractPliegoHybridMock.mockResolvedValueOnce({
        extraction: conRequisitos(),
        origen: ORIGEN_LLM,
      });
      extractStructuredMock.mockRejectedValueOnce(new Error("cuota agotada"));
      const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});

      expect(await subir()).toEqual({ ok: true, gateMatematicoPasado: true });
      expect(aviso).toHaveBeenCalledWith(expect.stringContaining("cuota agotada"));
      aviso.mockRestore();
    });
  });
});
