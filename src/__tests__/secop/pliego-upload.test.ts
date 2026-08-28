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
});
