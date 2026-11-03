import { expect, it } from "vitest";
import { recibeOfertas } from "@/src/lib/secop/estados-abierto";
import { parseDate } from "@/src/lib/transform/normalize";
const base = { estadoApertura: "Abierto", estadoActual: "Publicado" };
it.each(["2099-99-99", "2027-02-29", "2026-11-31"])(
  "una fecha imposible no habilita recepción: %s",
  (fechaRecepcion) => {
    expect(parseDate(fechaRecepcion)).toBeNull();
    expect(recibeOfertas({ ...base, fechaRecepcion }, new Date("2026-11-03T17:00:00Z"))).toBe(
      false
    );
  }
);
it("vence al cambiar de día en Colombia y una nueva fecha oficial reabre la ventana", () => {
  const p = { ...base, fechaRecepcion: "2026-11-03" };
  expect(recibeOfertas(p, new Date("2026-11-04T04:59:59Z"))).toBe(true);
  expect(recibeOfertas(p, new Date("2026-11-04T05:00:00Z"))).toBe(false);
  expect(
    recibeOfertas({ ...p, fechaRecepcion: "2026-11-10" }, new Date("2026-11-04T05:00:00Z"))
  ).toBe(true);
  expect(recibeOfertas({ ...p, estadoActual: "Cancelado" }, new Date("2026-11-03T17:00:00Z"))).toBe(
    false
  );
});
