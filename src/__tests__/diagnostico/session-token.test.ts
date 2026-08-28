import { describe, it, expect } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  DIAGNOSTICO_COOKIE,
  borrarSessionToken,
  escribirSessionToken,
  esSessionTokenValido,
  leerSessionToken,
  nuevoSessionToken,
} from "@/src/lib/diagnostico/session-token";

const conCookie = (valor: string) => {
  const req = new NextRequest("http://localhost/api/diagnostico", { method: "POST" });
  req.cookies.set(DIAGNOSTICO_COOKIE, valor);
  return req;
};

describe("session-token", () => {
  it("genera un token con forma de UUID que se valida a sí mismo", () => {
    const token = nuevoSessionToken();
    expect(esSessionTokenValido(token)).toBe(true);
    expect(nuevoSessionToken()).not.toBe(token);
  });

  it("rechaza cualquier cosa que no sea un UUID", () => {
    // La cookie la controla el cliente y termina en un WHERE: no se acepta
    // cadena arbitraria.
    for (const basura of ["", "abc", "' OR 1=1 --", "../../etc/passwd", 42, null, undefined]) {
      expect(esSessionTokenValido(basura)).toBe(false);
    }
  });

  it("lee el token de la cookie y descarta el inválido", () => {
    const token = nuevoSessionToken();
    expect(leerSessionToken(conCookie(token))).toBe(token);
    expect(leerSessionToken(conCookie("no-es-un-uuid"))).toBeNull();
    expect(
      leerSessionToken(new NextRequest("http://localhost/api/diagnostico", { method: "POST" }))
    ).toBeNull();
  });

  it("escribe la cookie como httpOnly y con ruta raíz", () => {
    const res = NextResponse.json({ ok: true });
    const token = nuevoSessionToken();
    escribirSessionToken(res, token);

    const cookie = res.cookies.get(DIAGNOSTICO_COOKIE);
    expect(cookie?.value).toBe(token);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/");
    expect(cookie?.maxAge).toBe(90 * 24 * 60 * 60);
  });

  it("borrar la cookie la vacía y la expira", () => {
    const res = NextResponse.json({ ok: true });
    borrarSessionToken(res);
    const cookie = res.cookies.get(DIAGNOSTICO_COOKIE);
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
  });
});
