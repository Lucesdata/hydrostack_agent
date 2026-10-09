import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));
import { sendDigestEmail } from "@/src/lib/email/send";

const digest = {
  subject: "Novedades",
  html: "<p>Ficha</p>",
  text: "Ficha",
  unsubscribeUrl: "https://aqualicita.com/api/alertas/unsubscribe?token=test",
};
beforeEach(() => {
  vi.stubEnv("AUTH_RESEND_KEY", "re_test");
  vi.stubEnv("EMAIL_FROM", "AquaLicita <avisos@alertas.aqualicita.com>");
  send.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("Reply-To corporativo", () => {
  const ok = { data: { id: "email-1" }, error: null };
  it("no envía Reply-To si EMAIL_REPLY_TO no está definida", async () => {
    send.mockResolvedValue(ok);
    await sendDigestEmail("test@example.com", digest);
    expect(send.mock.calls[0][0]).not.toHaveProperty("replyTo");
  });
  it("lo añade cuando es una dirección válida", async () => {
    vi.stubEnv("EMAIL_REPLY_TO", "contacto@aqualicita.com");
    send.mockResolvedValue(ok);
    await sendDigestEmail("test@example.com", digest);
    expect(send.mock.calls[0][0].replyTo).toBe("contacto@aqualicita.com");
  });
  it("ignora un valor que no es una dirección", async () => {
    vi.stubEnv("EMAIL_REPLY_TO", "no es un correo");
    send.mockResolvedValue(ok);
    await sendDigestEmail("test@example.com", digest);
    expect(send.mock.calls[0][0]).not.toHaveProperty("replyTo");
  });
});

describe("confirmación del proveedor", () => {
  it("devuelve el identificador aceptado para correlacionar la entrega", async () => {
    send.mockResolvedValue({ data: { id: "email-1" }, error: null });
    expect(await sendDigestEmail("test@example.com", digest)).toBe("email-1");
  });
  it.each([
    { data: null, error: null },
    { data: { id: "" }, error: null },
  ])("rechaza una respuesta sin identificador: %j", async (response) => {
    send.mockResolvedValue(response);
    await expect(sendDigestEmail("test@example.com", digest)).rejects.toThrow(/identificador/);
  });
  it("propaga el rechazo del proveedor", async () => {
    send.mockResolvedValue({ data: null, error: { message: "dominio sin verificar" } });
    await expect(sendDigestEmail("test@example.com", digest)).rejects.toThrow(
      "dominio sin verificar"
    );
  });
});
