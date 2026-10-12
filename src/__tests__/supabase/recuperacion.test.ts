import { describe, expect, it } from "vitest";
import { esDestinoRecuperacion } from "@/src/lib/supabase/recuperacion";

describe("esDestinoRecuperacion", () => {
  it.each(["/restablecer", "/restablecer?next=%2Fmis-procesos"])("reconoce %s", (next) =>
    expect(esDestinoRecuperacion(next)).toBe(true)
  );
  it.each(["/", "/mis-procesos", "/restablecer-algo", "/x/restablecer", "//restablecer"])(
    "no confunde %s con la pantalla de contraseña nueva",
    (next) => expect(esDestinoRecuperacion(next)).toBe(false)
  );
});
