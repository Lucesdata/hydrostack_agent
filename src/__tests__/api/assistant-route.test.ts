// src/__tests__/api/assistant-route.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/src/lib/supabase/get-session-user", () => ({
  getSessionUser: () => mockAuth(),
}));

vi.mock("@/src/lib/signals/record-signal", () => ({
  recordUserSignal: vi.fn(),
}));

const mockSaveMessages = vi.fn();
const mockLoadMessages = vi.fn().mockResolvedValue([]);
vi.mock("@/src/lib/assistants/conversations", () => ({
  getOrCreateConversation: vi.fn().mockResolvedValue("conv-1"),
  loadMessages: () => mockLoadMessages(),
  saveMessages: (...args: unknown[]) => mockSaveMessages(...args),
}));

vi.mock("@/src/lib/assistants/documents", () => ({
  getDocumentById: vi.fn().mockResolvedValue(null),
  getLatestDocument: vi.fn().mockResolvedValue(null),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => "mock-model"),
}));

let capturedOnEnd: ((args: { messages: unknown[] }) => Promise<void>) | undefined;
vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    streamText: vi.fn(() => ({
      stream: new ReadableStream(),
      consumeStream: vi.fn(),
    })),
    toUIMessageStream: vi.fn((options: { onEnd?: typeof capturedOnEnd }) => {
      capturedOnEnd = options.onEnd;
      return new ReadableStream({
        start(controller) {
          controller.close();
        },
      });
    }),
  };
});

const postReq = (body: unknown) =>
  new NextRequest("http://localhost/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("POST /api/assistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = "test-key";
    mockLoadMessages.mockResolvedValue([]);
    capturedOnEnd = undefined;
  });

  it("500 sin ANTHROPIC_API_KEY", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { POST } = await import("@/app/api/assistant/route");
    const res = await POST(postReq({ context: "ejecucion", messages: [] }));
    expect(res.status).toBe(500);
  });

  it("401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import("@/app/api/assistant/route");
    const res = await POST(postReq({ context: "ejecucion", messages: [] }));
    expect(res.status).toBe(401);
  });

  it("400 con contexto desconocido", async () => {
    mockAuth.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    const { POST } = await import("@/app/api/assistant/route");
    const res = await POST(
      postReq({ context: "inventado", messages: [{ id: "1", role: "user", parts: [] }] })
    );
    expect(res.status).toBe(400);
  });

  it("400 sin messages", async () => {
    mockAuth.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    const { POST } = await import("@/app/api/assistant/route");
    const res = await POST(postReq({ context: "ejecucion", messages: [] }));
    expect(res.status).toBe(400);
  });

  it("200 con contexto y mensajes válidos", async () => {
    mockAuth.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    const { POST } = await import("@/app/api/assistant/route");
    const res = await POST(
      postReq({
        context: "ejecucion",
        messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "hola" }] }],
      })
    );
    expect(res.status).toBe(200);
  });

  it("onEnd persiste solo los mensajes que aún no estaban guardados", async () => {
    mockAuth.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    mockLoadMessages.mockResolvedValue([
      { id: "m1", role: "user", parts: [{ type: "text", text: "hola" }] },
    ]);
    const { POST } = await import("@/app/api/assistant/route");

    const res = await POST(
      postReq({
        context: "ejecucion",
        messages: [{ id: "m1", role: "user", parts: [{ type: "text", text: "hola" }] }],
      })
    );
    expect(res.status).toBe(200);
    expect(capturedOnEnd).toBeDefined();

    const finalMessages = [
      { id: "m1", role: "user", parts: [{ type: "text", text: "hola" }] },
      { id: "m2", role: "assistant", parts: [{ type: "text", text: "respuesta" }] },
    ];
    await capturedOnEnd!({ messages: finalMessages });

    expect(mockSaveMessages).toHaveBeenCalledTimes(1);
    expect(mockSaveMessages).toHaveBeenCalledWith("conv-1", [finalMessages[1]]);
  });

  it("onEnd persiste por id incluso si el cliente no conocía todos los mensajes ya guardados", async () => {
    mockAuth.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    // Simula otra pestaña que ya guardó un turno completo (m1, m2) que este
    // cliente no conoce todavía.
    mockLoadMessages.mockResolvedValue([
      { id: "m1", role: "user", parts: [] },
      { id: "m2", role: "assistant", parts: [] },
    ]);
    const { POST } = await import("@/app/api/assistant/route");

    const res = await POST(
      postReq({ context: "ejecucion", messages: [{ id: "m1", role: "user", parts: [] }] })
    );
    expect(res.status).toBe(200);
    expect(capturedOnEnd).toBeDefined();

    // Lo que ESTE cliente ve: m1 + un turno nuevo (m3, m4). No conoce m2.
    // El viejo `slice(alreadySaved.length)` == slice(2) sobre [m1, m3, m4]
    // habría dejado solo [m4], perdiendo m3 silenciosamente.
    const finalMessages = [
      { id: "m1", role: "user", parts: [] },
      { id: "m3", role: "user", parts: [] },
      { id: "m4", role: "assistant", parts: [] },
    ];
    await capturedOnEnd!({ messages: finalMessages });

    expect(mockSaveMessages).toHaveBeenCalledTimes(1);
    expect(mockSaveMessages).toHaveBeenCalledWith("conv-1", [finalMessages[1], finalMessages[2]]);
  });
});
