import { describe, expect, it } from "vitest";
import { ingestaTruncada, resumenTick } from "@/src/lib/ingest/tick-status";
import type { RunOutput } from "@/src/lib/ingest/pipeline";

function corrida(conTruncamiento: "procesos" | "contratos" | "sweep" | null): RunOutput {
  const keyset = (truncated: boolean) => ({
    reachedMaxPages: truncated,
    source: "test",
    batchId: "00000000-0000-0000-0000-000000000000",
    windowStart: null,
    watermarkTo: null,
    recordsIngested: 0,
    pages: 1,
  });
  return {
    startedAt: "2026-11-11T00:00:00Z",
    durationMs: 1,
    procesos: { keyset: keyset(conTruncamiento === "procesos"), sweep: null },
    contratos: {
      keyset: keyset(conTruncamiento === "contratos"),
      sweep: {
        reachedMaxPages: conTruncamiento === "sweep",
        source: "test",
        batchId: "00000000-0000-0000-0000-000000000000",
        pages: 1,
        recordsIngested: 0,
        totalScanned: 0,
      },
    },
    transform: null,
  };
}

describe("resultado observable del cron tick", () => {
  it("treats all completed stages as successful", () => {
    expect(ingestaTruncada(corrida(null))).toBe(false);
    expect(resumenTick([{ ok: true }, { ok: true }, { ok: true }], false)).toEqual({
      ok: true,
      status: 200,
    });
  });

  it.each(["procesos", "contratos", "sweep"] as const)(
    "detects truncation in %s",
    (source) => {
      expect(ingestaTruncada(corrida(source))).toBe(true);
      expect(resumenTick([{ ok: true }], true)).toEqual({ ok: false, status: 500 });
    }
  );

  it("does not hide downstream failures behind a successful ingestion", () => {
    expect(resumenTick([{ ok: true }, { ok: false }], false)).toEqual({
      ok: false,
      status: 500,
    });
  });

  it("does not report success when no stages ran", () => {
    expect(resumenTick([], false)).toEqual({ ok: false, status: 500 });
  });

  it("handles absent ingestion data", () => {
    expect(ingestaTruncada(null)).toBe(false);
  });
});
