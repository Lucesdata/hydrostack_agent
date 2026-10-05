/**
 * La sesión local (docs/entorno-local.md) no puede activarse fuera de
 * `next dev` con AQ_SESION_LOCAL=1: es lo que impide que llegue a producción.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  COOKIE_SESION_LOCAL,
  sesionLocalActiva,
  USUARIOS_LOCALES,
  usuarioLocal,
} from "@/src/lib/sesion-local/sesion-local";
import { GET } from "@/app/dev/sesion/route";

const ANA = USUARIOS_LOCALES[0];

afterEach(() => vi.unstubAllEnvs());

function entorno(nodeEnv: string, bandera?: string) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  if (bandera === undefined) vi.stubEnv("AQ_SESION_LOCAL", "");
  else vi.stubEnv("AQ_SESION_LOCAL", bandera);
}

describe("sesionLocalActiva", () => {
  it("solo con NODE_ENV=development y AQ_SESION_LOCAL=1", () => {
    entorno("development", "1");
    expect(sesionLocalActiva()).toBe(true);
  });

  it.each([
    ["production", "1"],
    ["test", "1"],
    ["development", undefined],
    ["development", "true"],
  ])("NODE_ENV=%s, AQ_SESION_LOCAL=%s → inactiva", (nodeEnv, bandera) => {
    entorno(nodeEnv, bandera);
    expect(sesionLocalActiva()).toBe(false);
  });
});

describe("usuarioLocal", () => {
  it("devuelve el usuario de la lista cuyo id lleva la cookie", () => {
    entorno("development", "1");
    expect(usuarioLocal(ANA.id)).toEqual(ANA);
  });

  it("un id fuera de la lista, o sin cookie, es «sin sesión»", () => {
    entorno("development", "1");
    expect(usuarioLocal("otro-id")).toBeNull();
    expect(usuarioLocal(undefined)).toBeNull();
  });

  it("en producción ignora la cookie aunque nombre a un usuario de la lista", () => {
    entorno("production", "1");
    expect(usuarioLocal(ANA.id)).toBeNull();
  });
});

describe("GET /dev/sesion", () => {
  const req = (qs = "") => new NextRequest(`http://localhost/dev/sesion${qs}`);

  it("responde 404 fuera del modo local", () => {
    entorno("production", "1");
    expect(GET(req(`?usuario=${ANA.id}`)).status).toBe(404);
  });

  it("entra como el usuario pedido y vuelve a `next`", () => {
    entorno("development", "1");
    const r = GET(req(`?usuario=${ANA.id}&next=/licitaciones`));
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe("http://localhost/licitaciones");
    expect(r.cookies.get(COOKIE_SESION_LOCAL)?.value).toBe(ANA.id);
  });

  it("no redirige fuera del sitio", () => {
    entorno("development", "1");
    const r = GET(req(`?usuario=${ANA.id}&next=//evil.example`));
    expect(r.headers.get("location")).toBe("http://localhost/");
  });

  it("sin usuario lista los de prueba; un id desconocido no da sesión", () => {
    entorno("development", "1");
    const r = GET(req("?usuario=desconocido"));
    expect(r.status).toBe(200);
    expect(r.cookies.get(COOKIE_SESION_LOCAL)).toBeUndefined();
  });
});
