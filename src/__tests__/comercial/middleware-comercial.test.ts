/**
 * `/comercial/*` no debe revelarse con la bandera apagada: el middleware NO puede
 * redirigir al anónimo al login (307), porque entonces la ruta «existiría». Las páginas
 * comprueban la bandera (404) y después la sesión. Se fija junto a una ruta que SÍ debe
 * seguir protegida, para que el cambio no abra nada más.
 */
import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/src/lib/supabase/middleware", () => ({
  updateSession: async () => ({ response: NextResponse.next(), user: null }),
}));

import { middleware } from "@/middleware";

const pedir = (ruta: string) => middleware(new NextRequest(`https://aqualicita.test${ruta}`));

describe("middleware: rutas /comercial", () => {
  it("un anónimo en /comercial/perfil NO es redirigido al login (la página decide: 404 o login)", async () => {
    const r = await pedir("/comercial/perfil");
    expect(r.status).toBe(200);
    expect(r.headers.get("location")).toBeNull();
  });

  it("tampoco el resto de /comercial/*", async () => {
    for (const ruta of ["/comercial/explorar", "/comercial/contratos/CO1.PCCNTR.1"]) {
      expect((await pedir(ruta)).headers.get("location")).toBeNull();
    }
  });

  it("las rutas que sí exigen cuenta siguen redirigiendo al login con su destino", async () => {
    for (const ruta of ["/mis-procesos", "/cuenta", "/diagnostico/historial"]) {
      const r = await pedir(ruta);
      expect(r.status).toBe(307);
      expect(new URL(r.headers.get("location") ?? "").pathname).toBe("/login");
      expect(new URL(r.headers.get("location") ?? "").searchParams.get("next")).toBe(ruta);
    }
  });
});
