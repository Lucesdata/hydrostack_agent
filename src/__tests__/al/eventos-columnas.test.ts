import { describe, it, expect } from "vitest";
import { estadoDesdeProceso } from "@/src/lib/al/eventos/correr";

describe("estadoDesdeProceso", () => {
  it("mapea la fila canónica al snapshot de al_proceso_estado", () => {
    const e = estadoDesdeProceso({
      secopProcesoId: "CO1.REQ.1",
      estadoActual: "Presentación de oferta",
      estadoApertura: "Abierto",
      valorEstimado: "1000.00",
      modalidad: "Licitación pública",
      fechaRecepcion: "2026-10-01",
      adjudicado: false,
      valorAdjudicacion: null,
      nitAdjudicatario: null,
      objeto: "Acueducto",
      descripcion: "Red veredal",
    });
    expect(e.estado).toBe("Presentación de oferta");
    expect(e.estadoApertura).toBe("Abierto");
    expect(e.adjudicado).toBe(false);
    // 32, no 64: `objetoHash` reutiliza `hash()` de `detectar.ts`, que trunca
    // el sha256 a 32 hex — igual que la fórmula ya persistida en
    // `al_proceso_estado`. Ver el test de compatibilidad más abajo.
    expect(e.objetoHash).toHaveLength(32);
  });

  it("el objetoHash cambia si cambia la descripción", () => {
    const base = {
      secopProcesoId: "CO1.REQ.1",
      estadoActual: null,
      estadoApertura: null,
      valorEstimado: null,
      modalidad: null,
      fechaRecepcion: null,
      adjudicado: null,
      valorAdjudicacion: null,
      nitAdjudicatario: null,
      objeto: "Acueducto",
    };
    const a = estadoDesdeProceso({ ...base, descripcion: "uno" });
    const b = estadoDesdeProceso({ ...base, descripcion: "dos" });
    expect(a.objetoHash).not.toBe(b.objetoHash);
  });
});

describe("objetoHash — compatibilidad con las filas ya persistidas", () => {
  // CRÍTICO: `al_proceso_estado` no se trunca en este plan, así que las
  // ~50.584 filas ya escritas en producción con la fórmula vieja
  // (`hash(texto(nombre), texto(descripcion))` de `detectar.ts`: separador
  // NUL, sha256 truncado a 32 hex) siguen ahí. Si `objetoHash` se calcula
  // distinto hoy, TODA fila con línea base reporta un falso "Objeto o
  // descripción" cambiado en la primera corrida post-despliegue — el
  // detector de adendas se llena de ruido para todo proceso vigilado.
  //
  // Este literal es la salida real de la fórmula vieja para el mismo par
  // (objeto, descripcion), calculada una sola vez con la definición de
  // `hash()` que seguía viva en `detectar.ts` antes de este fix:
  //
  //   createHash("sha256")
  //     .update(["Acueducto veredal", "Construcción del sistema de acueducto en zona rural"]
  //       .map((p) => p ?? "").join("\0"))
  //     .digest("hex")
  //     .slice(0, 32)
  //
  // Si esta aserción falla, la fórmula volvió a divergir de los datos
  // persistidos: no se toca el literal, se investiga qué cambió en `hash()`
  // o en cómo se le llama.
  it("reproduce byte a byte el objetoHash de la fórmula vieja para el mismo (objeto, descripción)", () => {
    const e = estadoDesdeProceso({
      secopProcesoId: "CO1.REQ.1",
      estadoActual: null,
      estadoApertura: null,
      valorEstimado: null,
      modalidad: null,
      fechaRecepcion: null,
      adjudicado: null,
      valorAdjudicacion: null,
      nitAdjudicatario: null,
      objeto: "Acueducto veredal",
      descripcion: "Construcción del sistema de acueducto en zona rural",
    });
    expect(e.objetoHash).toBe("f2a8e0f95331ec7503b480bf4ecd6009");
  });
});
