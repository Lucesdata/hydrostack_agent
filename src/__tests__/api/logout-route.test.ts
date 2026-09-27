import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

const signOut = vi.fn().mockResolvedValue({ error: null });
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { signOut } }),
}));

const borrarSessionToken = vi.fn();
vi.mock("@/src/lib/diagnostico/session-token", () => ({
  borrarSessionToken: (...args: unknown[]) => borrarSessionToken(...args),
}));

import { POST } from "@/app/logout/route";

describe("POST /logout", () => {
  it("cierra la sesión y redirige a la portada con 303", async () => {
    const res = await POST(new NextRequest("http://localhost/logout", { method: "POST" }));
    expect(signOut).toHaveBeenCalled();
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost/");
  });

  it("no deja nada de la cuenta en el navegador: diagnóstico anónimo y perfil local", async () => {
    const res = await POST(new NextRequest("http://localhost/logout", { method: "POST" }));
    expect(borrarSessionToken).toHaveBeenCalledWith(res);
    // El perfil de oferente que SecopExplorer copia al localStorage. Solo
    // "storage": las cookies de Supabase ya las limpia signOut.
    expect(res.headers.get("Clear-Site-Data")).toBe('"storage"');
  });
});
