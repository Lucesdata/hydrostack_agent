import { describe, it, expect } from "vitest";
import {
  authErrorCode,
  authErrorMessage,
  authNoticeMessage,
} from "@/src/lib/supabase/auth-messages";

describe("authErrorCode", () => {
  it("sin mensaje devuelve el fallback de quien llama", () => {
    expect(authErrorCode(undefined, "signup_error")).toBe("signup_error");
    expect(authErrorCode(null, "invalid_credentials")).toBe("invalid_credentials");
    expect(authErrorCode("", "signup_error")).toBe("signup_error");
  });

  // El fallo real que bloqueó el registro entre el 2026-08-18 y el 2026-09-07:
  // el servicio de correo integrado de Supabase se niega a enviar a direcciones
  // que no son del equipo del proyecto. La cuenta SÍ queda creada en
  // `auth.users`, así que "intenta de nuevo" manda al usuario a chocar contra
  // "User already registered" — por eso necesita código propio.
  it("reconoce el rechazo del correo por dirección no autorizada", () => {
    expect(authErrorCode("Email address not authorized", "signup_error")).toBe(
      "email_delivery_failed"
    );
  });

  it("reconoce el fallo genérico de envío del correo de confirmación", () => {
    expect(authErrorCode("Error sending confirmation email", "signup_error")).toBe(
      "email_delivery_failed"
    );
  });

  it("reconoce la cuota horaria del remitente", () => {
    expect(authErrorCode("email rate limit exceeded", "signup_error")).toBe("rate_limit");
  });

  it("reconoce el correo ya registrado", () => {
    expect(authErrorCode("User already registered", "signup_error")).toBe("email_exists");
  });

  it("reconoce el correo sin verificar y las credenciales inválidas", () => {
    expect(authErrorCode("Email not confirmed", "invalid_credentials")).toBe("email_not_confirmed");
    expect(authErrorCode("Invalid login credentials", "invalid_credentials")).toBe(
      "invalid_credentials"
    );
  });

  it("reconoce la contraseña débil rechazada por el servidor", () => {
    expect(authErrorCode("Password should be at least 8 characters", "signup_error")).toBe(
      "weak_password"
    );
  });

  it("ignora mayúsculas y texto alrededor", () => {
    expect(authErrorCode("AuthApiError: EMAIL ADDRESS NOT AUTHORIZED", "signup_error")).toBe(
      "email_delivery_failed"
    );
  });

  it("un mensaje desconocido cae al fallback en vez de inventar un código", () => {
    expect(authErrorCode("Something nobody has seen before", "signup_error")).toBe("signup_error");
  });

  // Un fallo de entrega no es culpa del usuario y no se arregla reintentando:
  // el fallback "Intenta de nuevo" era justamente lo que ocultaba el problema.
  it("todo código que produce tiene mensaje propio, no el genérico", () => {
    const codigos = [
      "email_delivery_failed",
      "rate_limit",
      "email_exists",
      "email_not_confirmed",
      "invalid_credentials",
      "weak_password",
    ];
    for (const codigo of codigos) {
      expect(authErrorMessage(codigo)).not.toBe("Ocurrió un error. Intenta de nuevo.");
    }
  });

  it("el mensaje de fallo de entrega no invita a reintentar el registro", () => {
    expect(authErrorMessage("email_delivery_failed")).not.toMatch(/intenta de nuevo/i);
  });
});

describe("authNoticeMessage", () => {
  it("anuncia el reenvío de la verificación", () => {
    expect(authNoticeMessage("confirmation_resent")).toBeTruthy();
  });

  it("un aviso desconocido es null, no un texto inventado", () => {
    expect(authNoticeMessage("no_existe")).toBeNull();
  });
});
