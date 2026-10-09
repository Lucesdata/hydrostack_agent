import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { NextRequest } from "next/server";
import { firmar } from "@/src/lib/al/notificacion/svix";

const holder = vi.hoisted(() => ({ db: undefined as unknown }));
vi.mock("@/src/lib/db/client", () => ({
  get db() {
    return holder.db;
  },
}));
import { POST } from "@/app/api/webhooks/resend/route";

const pg = new PGlite();
const secret = "whsec_" + Buffer.from("local-test-only").toString("base64");
function request(event: unknown) {
  const body = JSON.stringify(event);
  const timestamp = String(Math.floor(Date.now() / 1000));
  return new NextRequest("https://aqualicita.com/api/webhooks/resend", {
    method: "POST",
    body,
    headers: {
      "svix-id": "event-test",
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${firmar(secret, "event-test", timestamp, body)}`,
    },
  });
}
beforeAll(async () => {
  holder.db = drizzle(pg);
  await pg.exec(`
    CREATE TABLE usuario (id text primary key, email text);
    CREATE TABLE envio_log (id uuid primary key, usuario_id text, proveedor_mensaje_id text, estado_entrega text, entrega_actualizada_en timestamptz, enviado_en timestamptz DEFAULT now());
    CREATE TABLE alerta_preferencias (usuario_id text primary key, activo boolean DEFAULT true, hora_envio smallint DEFAULT 7, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), account_id text, eventos_notificables text[]);
  `);
});
beforeEach(async () => {
  holder.db = drizzle(pg);
  vi.stubEnv("RESEND_WEBHOOK_SECRET", secret);
  await pg.exec(`TRUNCATE usuario, envio_log, alerta_preferencias;
    INSERT INTO usuario VALUES ('u1', 'test@example.com');
    INSERT INTO envio_log (id, usuario_id, proveedor_mensaje_id) VALUES ('00000000-0000-0000-0000-000000000001', 'u1', 'email-digest');`);
});
afterAll(async () => {
  vi.unstubAllEnvs();
  await pg.close();
});
const event = (type: string, id = "email-digest") => ({
  type,
  data: { email_id: id, to: ["test@example.com"] },
});
async function state() {
  return (await pg.query<{ estado_entrega: string | null }>("SELECT estado_entrega FROM envio_log"))
    .rows[0].estado_entrega;
}

describe("webhook firmado y correlación real en Postgres", () => {
  it("un reenvío manual entre SELECT y UPDATE no recibe el evento del mensaje anterior", async () => {
    const database = drizzle(pg);
    holder.db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => {
              const { rows } = await pg.query(
                'SELECT id, usuario_id AS "usuarioId" FROM envio_log'
              );
              // Simula un envío aceptado que sustituye el id tras la lectura del webhook.
              await pg.exec("UPDATE envio_log SET proveedor_mensaje_id='email-replacement'");
              return rows;
            },
          }),
        }),
      }),
      update: database.update.bind(database),
      insert: database.insert.bind(database),
    };
    const res = await POST(request(event("email.delivered")));
    expect(res.status).toBe(503);
    const { rows } = await pg.query<{
      proveedor_mensaje_id: string;
      estado_entrega: string | null;
    }>("SELECT proveedor_mensaje_id, estado_entrega FROM envio_log");
    expect(rows[0]).toEqual({ proveedor_mensaje_id: "email-replacement", estado_entrega: null });
  });
  it("un evento de otro correo no se atribuye al último digest del destinatario", async () => {
    await POST(request(event("email.delivered", "email-auth")));
    expect(await state()).toBeNull();
  });
  it("un correo de Auth (cuenta.) se confirma sin consultar la base ni pedir reintentos", async () => {
    holder.db = undefined; // cualquier acceso a la base fallaría
    const res = await POST(
      request({
        type: "email.delivered",
        data: {
          email_id: "email-auth",
          from: "AquaLicita <no-responder@cuenta.aqualicita.com>",
          to: ["test@example.com"],
        },
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, ignorado: "auth" });
  });
  it("un identificador todavía no registrado solicita un reintento", async () => {
    expect((await POST(request(event("email.delivered", "email-pending")))).status).toBe(503);
  });
  it("una queja apaga inmediatamente las alertas de la cuenta correcta", async () => {
    const res = await POST(request(event("email.complained")));
    expect(res.status).toBe(200);
    expect(await state()).toBe("complained");
    expect(
      (
        await pg.query<{ activo: boolean }>(
          "SELECT activo FROM alerta_preferencias WHERE usuario_id='u1'"
        )
      ).rows[0]?.activo
    ).toBe(false);
  });
  it("entregas atrasadas no borran una queja ya procesada", async () => {
    await POST(request(event("email.complained")));
    await POST(request(event("email.delivered")));
    expect(await state()).toBe("complained");
  });
  it("un cuerpo firmado pero nulo se rechaza sin modificar datos", async () => {
    expect((await POST(request(null))).status).toBe(400);
    expect(await state()).toBeNull();
  });
});
