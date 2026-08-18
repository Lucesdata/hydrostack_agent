import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Match } from "@/src/lib/matching/match";

const insertValuesMock = vi.fn();
const insertOnConflictMock = vi.fn();
const updateWhereMock = vi.fn();
const selectLimitMock = vi.fn();

vi.mock("@/src/lib/db/client", () => ({
  db: {
    insert: () => ({
      values: (...args: unknown[]) => {
        insertValuesMock(...args);
        return { onConflictDoNothing: (...cArgs: unknown[]) => insertOnConflictMock(...cArgs) };
      },
    }),
    update: () => ({
      set: () => ({ where: (...args: unknown[]) => updateWhereMock(...args) }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: (...args: unknown[]) => selectLimitMock(...args),
        }),
      }),
    }),
  },
}));

import {
  recordCoincidencias,
  markCoincidenciasVistas,
  hasCoincidenciasNoVistas,
} from "@/src/lib/matching/record-coincidencias";

const matches = [
  { proceso: { id: "p1" }, verdict: { overall: "PASS" } },
  { proceso: { id: "p2" }, verdict: { overall: "WARN" } },
] as unknown as Match[];

describe("recordCoincidencias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertOnConflictMock.mockResolvedValue(undefined);
  });

  it("no toca la base si no hay matches", async () => {
    await recordCoincidencias("u1", []);
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it("inserta una fila por match con onConflictDoNothing por (usuarioId, procesoId)", async () => {
    await recordCoincidencias("u1", matches);
    expect(insertValuesMock).toHaveBeenCalledWith([
      { usuarioId: "u1", procesoId: "p1", veredictoOverall: "PASS" },
      { usuarioId: "u1", procesoId: "p2", veredictoOverall: "WARN" },
    ]);
    expect(insertOnConflictMock).toHaveBeenCalled();
  });
});

describe("markCoincidenciasVistas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateWhereMock.mockResolvedValue(undefined);
  });

  it("marca vistaEn para las coincidencias no vistas del usuario", async () => {
    await markCoincidenciasVistas("u1");
    expect(updateWhereMock).toHaveBeenCalled();
  });
});

describe("hasCoincidenciasNoVistas", () => {
  beforeEach(() => vi.clearAllMocks());

  it("true si hay al menos una fila sin vistaEn", async () => {
    selectLimitMock.mockResolvedValue([{ id: "c1" }]);
    await expect(hasCoincidenciasNoVistas("u1")).resolves.toBe(true);
  });

  it("false si no hay filas", async () => {
    selectLimitMock.mockResolvedValue([]);
    await expect(hasCoincidenciasNoVistas("u1")).resolves.toBe(false);
  });

  it("false si falla la consulta (ej. cuota de Neon excedida) — degrada sin crashear", async () => {
    selectLimitMock.mockRejectedValue(new Error("data transfer quota exceeded"));
    await expect(hasCoincidenciasNoVistas("u1")).resolves.toBe(false);
  });
});
