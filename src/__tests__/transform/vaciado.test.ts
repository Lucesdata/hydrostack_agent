import { describe, it, expect, vi } from "vitest";
import { vaciarPayloads } from "@/src/lib/transform/orchestrator";

describe("vaciarPayloads", () => {
  it("no toca la base con una lista vacía", async () => {
    const db = { update: vi.fn() };
    const n = await vaciarPayloads(db as never, []);
    expect(n).toBe(0);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("vacía en un solo statement por lote", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "a" }, { id: "b" }]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const db = { update: vi.fn().mockReturnValue({ set }) };
    const n = await vaciarPayloads(db as never, ["a", "b"]);
    expect(n).toBe(2);
    expect(db.update).toHaveBeenCalledTimes(1);
  });
});
