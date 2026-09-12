import { describe, it, expect } from "vitest";
import { serializarLote, type FilaArchivo } from "@/src/lib/archivo/exportar";

const fila = (id: string): FilaArchivo => ({
  id,
  source: "secop_ii_procesos",
  sourceRecordId: `CO1.REQ.${id}`,
  payloadHash: "abc123",
  ingestedAt: "2026-09-12T00:00:00.000Z",
  payload: { nombre_del_procedimiento: "Acueducto", precio_base: "1000" },
});

describe("serializarLote", () => {
  it("emite una línea NDJSON por fila, terminada en salto", () => {
    const out = serializarLote([fila("1"), fila("2")]);
    const lineas = out.split("\n").filter(Boolean);
    expect(lineas).toHaveLength(2);
    expect(JSON.parse(lineas[0]).sourceRecordId).toBe("CO1.REQ.1");
    expect(out.endsWith("\n")).toBe(true);
  });

  it("conserva el payload íntegro y sin reordenar claves del contenido", () => {
    const out = serializarLote([fila("1")]);
    const parsed = JSON.parse(out.trim());
    expect(parsed.payload).toEqual({
      nombre_del_procedimiento: "Acueducto",
      precio_base: "1000",
    });
  });

  it("un lote vacío produce cadena vacía, no un salto suelto", () => {
    expect(serializarLote([])).toBe("");
  });
});
