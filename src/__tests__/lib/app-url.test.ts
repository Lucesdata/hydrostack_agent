import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { appUrl } from "@/src/lib/app-url";

/**
 * `appUrl` decide el host sobre el que se construyen los enlaces que salen de
 * la app: el `redirectTo` de OAuth, el `emailRedirectTo` del alta y los
 * enlaces de los correos. Equivocarlo no rompe el build — manda al usuario a
 * otro dominio, que es como se perdió el login al conectar aqualicita.com.
 */
describe("appUrl", () => {
  const ORIGINAL = {
    app: process.env.NEXT_PUBLIC_APP_URL,
    branch: process.env.VERCEL_BRANCH_URL,
  };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.VERCEL_BRANCH_URL;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = ORIGINAL.app;
    process.env.VERCEL_BRANCH_URL = ORIGINAL.branch;
  });

  it("usa NEXT_PUBLIC_APP_URL cuando está definida", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://aqualicita.com";
    expect(appUrl()).toBe("https://aqualicita.com");
  });

  it("en un preview usa VERCEL_BRANCH_URL con https", () => {
    process.env.VERCEL_BRANCH_URL =
      "aqualicita-git-mi-rama-giovannys-projects-a5ffd460.vercel.app";
    expect(appUrl()).toBe(
      "https://aqualicita-git-mi-rama-giovannys-projects-a5ffd460.vercel.app"
    );
  });

  it("NEXT_PUBLIC_APP_URL gana sobre VERCEL_BRANCH_URL", () => {
    // Producción define las dos. Si ganara la de Vercel, los enlaces de
    // producción apuntarían al host interno en vez de al dominio propio.
    process.env.NEXT_PUBLIC_APP_URL = "https://aqualicita.com";
    process.env.VERCEL_BRANCH_URL =
      "aqualicita-git-main-giovannys-projects-a5ffd460.vercel.app";
    expect(appUrl()).toBe("https://aqualicita.com");
  });

  it("cae a localhost:3000 cuando no hay ninguna de las dos", () => {
    expect(appUrl()).toBe("http://localhost:3000");
  });

  it("ignora NEXT_PUBLIC_APP_URL vacía y sigue al siguiente candidato", () => {
    // Una variable presente pero vacía en Vercel es un error de dedo fácil, y
    // con `??` pasaría el filtro y devolvería cadena vacía: todos los enlaces
    // quedarían como "/auth/callback", relativos y rotos en los correos.
    process.env.NEXT_PUBLIC_APP_URL = "";
    process.env.VERCEL_BRANCH_URL =
      "aqualicita-git-mi-rama-giovannys-projects-a5ffd460.vercel.app";
    expect(appUrl()).toBe(
      "https://aqualicita-git-mi-rama-giovannys-projects-a5ffd460.vercel.app"
    );
  });
});
