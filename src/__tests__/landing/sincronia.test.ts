import { describe, expect, it } from "vitest";
import {
  contenidoTooltip,
  dptoDesdeObjetivo,
  indicesDeModo,
} from "@/src/components/landing/hero-territorial/sincronia";
import { escalonDe, escalonMontoDe } from "@/src/lib/mapa/escala";

/** Un nodo mínimo con la API de DOM que usa la función. */
function nodo({
  dpto = null,
  enlace = false,
  ancestro = null,
  hijo = null,
}: {
  dpto?: string | null;
  enlace?: boolean;
  ancestro?: ReturnType<typeof nodo> | null;
  hijo?: ReturnType<typeof nodo> | null;
}): any {
  const self: any = {
    getAttribute: (n: string) => (n === "data-dpto" ? dpto : null),
    closest: () => (dpto ? self : (ancestro?.closest() ?? null)),
    matches: () => enlace,
    querySelector: () => hijo,
  };
  return self;
}

describe("dptoDesdeObjetivo", () => {
  it("lee el código del departamento bajo el puntero", () => {
    expect(dptoDesdeObjetivo(nodo({ dpto: "05" }))).toBe("05");
  });

  it("con foco de teclado, lo lee del camino dentro del enlace", () => {
    expect(dptoDesdeObjetivo(nodo({ enlace: true, hijo: nodo({ dpto: "76" }) }))).toBe("76");
  });

  it("en el hueco entre departamentos no inventa uno", () => {
    // El <svg>: no es un departamento ni un enlace, aunque contenga caminos.
    expect(dptoDesdeObjetivo(nodo({ hijo: nodo({ dpto: "05" }) }))).toBeNull();
    expect(dptoDesdeObjetivo(null)).toBeNull();
  });
});

describe("contenidoTooltip", () => {
  const departamentos = [
    {
      clave: "05",
      label: "Antioquia",
      n: 5000,
      tipos: { acueducto: 1200, alcantarillado: 900, ptap: 100, ptar: 300, otros: 2000 },
    },
    {
      clave: "99",
      label: "Vichada",
      n: 1,
      tipos: { acueducto: 0, alcantarillado: 0, ptap: 0, ptar: 0, otros: 1 },
    },
  ];
  const tipos = { acueducto: "Acueducto", otros: "Otros" };

  it("da nombre, cifra, % nacional y el subsistema más frecuente sin contar «otros»", () => {
    const t = contenidoTooltip({ dpto: "05", departamentos, totalAbiertos: 10000, tipos });
    expect(t.nombre).toBe("Antioquia");
    expect(t.n).toBe(5000);
    expect(t.pct).toBe(50);
    expect(t.principal).toEqual({ clave: "acueducto", n: 1200, label: "Acueducto" });
  });

  it("si solo hay «otros», no nombra un subsistema", () => {
    expect(
      contenidoTooltip({ dpto: "99", departamentos, totalAbiertos: 10000, tipos }).principal
    ).toBeNull();
  });

  it("un departamento sin procesos usa el nombre del mapa y no inventa %", () => {
    const t = contenidoTooltip({
      dpto: "97",
      nombre: "Vaupés",
      departamentos,
      totalAbiertos: 10000,
    });
    expect(t).toEqual({ nombre: "Vaupés", n: 0, pct: null, monto: 0, principal: null });
  });
});

describe("indicesDeModo", () => {
  const departamentos = [
    { clave: "05", n: 5000, montoAbierto: 2e12, tipos: { acueducto: 1200, ptar: 40 } },
    { clave: "99", n: 1, montoAbierto: 0, tipos: { acueducto: 0, ptar: 1 } },
  ];
  const base = { departamentos, escalonDe, escalonMontoDe };

  it("en «procesos» no repinta: manda el servidor", () => {
    expect(indicesDeModo({ ...base, modo: "procesos", tipo: null })).toBeNull();
  });

  it("en «monto» usa la escala del monto; sin presupuesto va a 0", () => {
    const m = indicesDeModo({ ...base, modo: "monto", tipo: null })!;
    expect(m.get("05")).toBe(4);
    expect(m.get("99")).toBe(0);
  });

  it("en «tipo» cuenta solo ese tipo, con la escala de procesos", () => {
    const m = indicesDeModo({ ...base, modo: "tipo", tipo: "ptar" })!;
    expect(m.get("05")).toBe(escalonDe(40).indice);
    expect(m.get("99")).toBe(escalonDe(1).indice);
    expect(indicesDeModo({ ...base, modo: "tipo", tipo: "acueducto" })!.get("99")).toBe(0);
  });

  it("el tooltip dice cuántos son del tipo filtrado", () => {
    const t = contenidoTooltip({
      dpto: "05",
      departamentos,
      totalAbiertos: 10000,
      tipoFiltro: "ptar",
    });
    expect(t.nTipo).toBe(40);
    expect(
      contenidoTooltip({ dpto: "05", departamentos, totalAbiertos: 10000 }).nTipo
    ).toBeUndefined();
  });
});
