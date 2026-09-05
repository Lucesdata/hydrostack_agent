/**
 * Firma de los webhooks de Resend (SDD §7.3).
 *
 * Un webhook de entrega sin verificar es un endpoint público con el que
 * cualquiera puede dar de baja las alertas de una cuenta ajena. Esta firma es lo
 * único que lo separa de un formulario abierto, así que se prueba de verdad y no
 * solo por el camino de "falta el secreto".
 */

import { describe, it, expect } from "vitest";
import { firmar, firmaValida, VENTANA_SEGUNDOS } from "@/src/lib/al/notificacion/svix";

const SECRET = "whsec_" + Buffer.from("secreto-de-prueba-1234").toString("base64");
const ID = "msg_2abc";
const BODY = JSON.stringify({ type: "email.bounced", data: { email_id: "e1" } });
const AHORA = 1_760_000_000_000;
const TS = String(Math.floor(AHORA / 1000));

const cab = (over: Partial<Record<string, string | null>> = {}) => ({
  id: ID,
  timestamp: TS,
  signature: `v1,${firmar(SECRET, ID, TS, BODY)}`,
  ...over,
});

describe("firmaValida", () => {
  it("acepta una firma correcta", () => {
    expect(firmaValida(SECRET, cab(), BODY, AHORA)).toBe(true);
  });

  it("acepta cuando el header trae varias firmas y una es la buena", () => {
    const s = `v1,ZmFsc2E= v1,${firmar(SECRET, ID, TS, BODY)}`;
    expect(firmaValida(SECRET, cab({ signature: s }), BODY, AHORA)).toBe(true);
  });

  it("rechaza si el cuerpo cambió aunque la firma sea de este mensaje", () => {
    // Es el ataque que importa: reenviar una firma válida con otro payload.
    expect(firmaValida(SECRET, cab(), BODY.replace("bounced", "delivered"), AHORA)).toBe(false);
  });

  it("rechaza una firma de otro secreto", () => {
    const otro = "whsec_" + Buffer.from("otro-secreto-distinto").toString("base64");
    const s = `v1,${firmar(otro, ID, TS, BODY)}`;
    expect(firmaValida(SECRET, cab({ signature: s }), BODY, AHORA)).toBe(false);
  });

  it("rechaza un replay fuera de la ventana", () => {
    const viejo = AHORA + (VENTANA_SEGUNDOS + 60) * 1000;
    expect(firmaValida(SECRET, cab(), BODY, viejo)).toBe(false);
  });

  it("acepta justo dentro de la ventana", () => {
    const casi = AHORA + (VENTANA_SEGUNDOS - 10) * 1000;
    expect(firmaValida(SECRET, cab(), BODY, casi)).toBe(true);
  });

  it("rechaza si falta cualquiera de las tres cabeceras", () => {
    for (const falta of ["id", "timestamp", "signature"] as const) {
      expect(firmaValida(SECRET, cab({ [falta]: null }), BODY, AHORA)).toBe(false);
    }
  });

  it("rechaza un timestamp que no es un número", () => {
    expect(firmaValida(SECRET, cab({ timestamp: "ayer" }), BODY, AHORA)).toBe(false);
  });
});
