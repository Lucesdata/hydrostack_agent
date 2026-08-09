import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DailyRunSummary } from "@/src/lib/alertas/run-daily";

// El core hace IO real (DB, matching, Resend). Se mockea para probar SOLO el
// route: el gate de CRON_SECRET y el mapeo de error → 500 (mismo patrón que
// src/__tests__/api/cron-ingest.test.ts).
vi.mock("@/src/lib/alertas/run-daily", () => ({
  runDailyAlertas: vi.fn(),
}));

import { GET } from "@/app/api/cron/alertas/route";
import { runDailyAlertas } from "@/src/lib/alertas/run-daily";

const mockedRun = vi.mocked(runDailyAlertas);

const SAMPLE: DailyRunSummary = {
  cuentas: 3,
  enviados: 2,
  sinCoincidencias: 1,
  saltados: 0,
  errores: 0,
};

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/cron/alertas", { headers });
}

describe("GET /api/cron/alertas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "s3cret";
    mockedRun.mockResolvedValue(SAMPLE);
  });

  it("rechaza con 401 cuando falta Authorization", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(mockedRun).not.toHaveBeenCalled();
  });

  it("rechaza con 401 con secreto incorrecto", async () => {
    const res = await GET(req({ authorization: "Bearer nope" }));
    expect(res.status).toBe(401);
    expect(mockedRun).not.toHaveBeenCalled();
  });

  it("ejecuta el envío diario con el secreto correcto", async () => {
    const res = await GET(req({ authorization: "Bearer s3cret" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.summary).toEqual(SAMPLE);
    expect(mockedRun).toHaveBeenCalledTimes(1);
  });

  it("mapea un fallo a 500 con el mensaje de error", async () => {
    mockedRun.mockRejectedValueOnce(new Error("boom"));
    const res = await GET(req({ authorization: "Bearer s3cret" }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("boom");
  });

  it("sin CRON_SECRET definido, rechaza con 401 (fail-closed)", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(mockedRun).not.toHaveBeenCalled();
  });
});
