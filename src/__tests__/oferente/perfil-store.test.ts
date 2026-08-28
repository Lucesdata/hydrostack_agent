import { describe, it, expect, vi } from "vitest";

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

import { savePerfilMinimoDb } from "@/src/lib/oferente/perfil-store";

describe("savePerfilMinimoDb", () => {
  it("hace upsert en oferente_perfil y devuelve ok:true", async () => {
    const perfil = {
      id: "u1",
      sectoresUnspsc: ["83101"],
      cobertura: { departamentos: ["76"], municipios: [] },
    };
    const r = await savePerfilMinimoDb("u1", perfil);
    expect(r).toEqual({ ok: true });
    expect(insertValuesMock).toHaveBeenCalledWith({ usuarioId: "u1", perfil });
  });

  it("devuelve ok:false DB_UNAVAILABLE si el insert lanza (modo concierge)", async () => {
    onConflictMock.mockRejectedValueOnce(new Error("connection refused"));
    const r = await savePerfilMinimoDb("u1", {
      id: "u1",
      sectoresUnspsc: [],
      cobertura: { departamentos: [], municipios: [] },
    });
    expect(r).toEqual({ ok: false, error: "DB_UNAVAILABLE" });
  });
});
