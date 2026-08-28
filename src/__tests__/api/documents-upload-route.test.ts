// src/__tests__/api/documents-upload-route.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
vi.mock("@/src/lib/supabase/get-session-user", () => ({
  getSessionUser: () => mockAuth(),
}));

const mockUpload = vi.fn();
vi.mock("@/src/lib/assistants/documents", async () => {
  const actual = await vi.importActual<typeof import("@/src/lib/assistants/documents")>(
    "@/src/lib/assistants/documents"
  );
  return { ...actual, uploadDocument: (...args: unknown[]) => mockUpload(...args) };
});

function pdfRequest(opts: { context?: string; fileContent?: string; fileName?: string }) {
  const formData = new FormData();
  if (opts.context !== undefined) formData.append("context", opts.context);
  if (opts.fileContent !== undefined) {
    formData.append(
      "file",
      new File([opts.fileContent], opts.fileName ?? "doc.pdf", { type: "application/pdf" })
    );
  }
  return new NextRequest("http://localhost/api/documents/upload", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/documents/upload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401 sin sesión", async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import("@/app/api/documents/upload/route");
    const res = await POST(pdfRequest({ context: "ejecucion", fileContent: "%PDF-1.4 x" }));
    expect(res.status).toBe(401);
  });

  it("400 con context inválido", async () => {
    mockAuth.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    const { POST } = await import("@/app/api/documents/upload/route");
    const res = await POST(pdfRequest({ context: "inventado", fileContent: "%PDF-1.4 x" }));
    expect(res.status).toBe(400);
  });

  it("400 sin archivo", async () => {
    mockAuth.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    const { POST } = await import("@/app/api/documents/upload/route");
    const res = await POST(pdfRequest({ context: "ejecucion" }));
    expect(res.status).toBe(400);
  });

  it("400 cuando el archivo no empieza con %PDF-", async () => {
    mockAuth.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    const { POST } = await import("@/app/api/documents/upload/route");
    const res = await POST(pdfRequest({ context: "ejecucion", fileContent: "no es un pdf" }));
    expect(res.status).toBe(400);
  });

  it("200 y devuelve documentId con un PDF válido", async () => {
    mockAuth.mockResolvedValue({ id: "user-1", email: "a@b.com" });
    mockUpload.mockResolvedValue({ id: "doc-1", textoExtraido: "texto extraído" });
    const { POST } = await import("@/app/api/documents/upload/route");
    const res = await POST(pdfRequest({ context: "ejecucion", fileContent: "%PDF-1.4 contenido" }));
    expect(res.status).toBe(200);
    expect((await res.json()).documentId).toBe("doc-1");
  });
});
