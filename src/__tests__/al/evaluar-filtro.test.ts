/**
 * Motor de matching determinista (SDD §6).
 *
 * Hay un caso por cada `MotivoDescarte` de la capa 'filtro', y un test que lo
 * comprueba mecánicamente: si alguien añade un motivo nuevo y no lo prueba, la
 * suite falla. Es el mismo patrón que protege la tabla de `acceso/politica.ts`.
 *
 * El test que más importa es el del filtro vacío. Si esa semántica se invierte,
 * un filtro recién creado devuelve silencio en vez del sector entero — y el
 * silencio es el modo de fallo caro de este producto.
 */

import { describe, it, expect } from "vitest";
import { evaluarFiltro } from "@/src/lib/al/matching/evaluar-filtro";
import { MOTIVOS, type MotivoDescarte } from "@/src/lib/al/matching/tipos";
import type { FiltroValidado } from "@/src/lib/al/filtros/tipos";
import type { ProcesoEvaluable } from "@/src/lib/al/matching/tipos";

const FILTRO_VACIO: FiltroValidado = {
  nombre: "sin criterios",
  activo: true,
  unspsc: [],
  palabrasClave: [],
  palabrasExcluidas: [],
  entidadesNit: [],
  divipola: [],
  modalidades: [],
  valorMin: null,
  valorMax: null,
  eventosNotificables: ["apertura", "adenda", "adjudicacion"],
};

const PROCESO: ProcesoEvaluable = {
  secopProcesoId: "CO1.REQ.999",
  objeto: "OPTIMIZACIÓN DE REDES DE ACUEDUCTO Y ALCANTARILLADO",
  nombre: "LP-2026-01",
  descripcion: "Construcción de PTAP municipal",
  unspsc: "83101500",
  entidadNit: "890399011",
  divipola: "05001",
  modalidad: "Licitación pública",
  valorEstimado: "800000000.00",
};

const f = (over: Partial<FiltroValidado>): FiltroValidado => ({ ...FILTRO_VACIO, ...over });

describe("evaluarFiltro — semántica del vacío", () => {
  it("un filtro sin criterios acepta TODO, no rechaza todo", () => {
    expect(evaluarFiltro(FILTRO_VACIO, PROCESO).motivo).toBeNull();
  });

  it("un filtro sin criterios acepta incluso un proceso sin datos", () => {
    const vacio: ProcesoEvaluable = {
      secopProcesoId: "CO1.REQ.0",
      objeto: null,
      nombre: null,
      descripcion: null,
      unspsc: null,
      entidadNit: null,
      divipola: null,
      modalidad: null,
      valorEstimado: null,
    };
    expect(evaluarFiltro(FILTRO_VACIO, vacio).motivo).toBeNull();
  });
});

describe("evaluarFiltro — coincidencia positiva", () => {
  it("casa por palabra clave", () => {
    expect(evaluarFiltro(f({ palabrasClave: ["ACUEDUCTO"] }), PROCESO).motivo).toBeNull();
  });

  it("casa por palabra clave ignorando tildes en ambos lados", () => {
    // "OPTIMIZACIÓN" en el objeto, "OPTIMIZACION" en el filtro.
    expect(evaluarFiltro(f({ palabrasClave: ["OPTIMIZACION"] }), PROCESO).motivo).toBeNull();
    // Y al revés: el filtro con tilde encuentra el texto sin ella.
    const sinTilde = { ...PROCESO, objeto: "OPTIMIZACION DE REDES" };
    expect(evaluarFiltro(f({ palabrasClave: ["OPTIMIZACIÓN"] }), sinTilde).motivo).toBeNull();
  });

  it("casa por UNSPSC, incluso con el código del filtro más corto (familia)", () => {
    expect(evaluarFiltro(f({ unspsc: ["83101"] }), PROCESO).motivo).toBeNull();
    expect(evaluarFiltro(f({ unspsc: ["83101500"] }), PROCESO).motivo).toBeNull();
  });

  it("basta con UNO de los dos: UNSPSC que no casa pero keyword que sí", () => {
    const r = evaluarFiltro(f({ unspsc: ["72141000"], palabrasClave: ["PTAP"] }), PROCESO);
    expect(r.motivo).toBeNull();
  });
});

describe("evaluarFiltro — un caso por motivo", () => {
  const casos: Record<Exclude<MotivoDescarte, "segmento_80_excluido">, () => void> = {
    sin_unspsc_ni_keyword: () => {
      const r = evaluarFiltro(f({ palabrasClave: ["MICROMEDICION"], unspsc: ["72141"] }), PROCESO);
      expect(r.motivo).toBe("sin_unspsc_ni_keyword");
      expect(r.evidencia.palabrasProbadas).toEqual(["MICROMEDICION"]);
    },
    palabra_excluida: () => {
      const r = evaluarFiltro(f({ palabrasExcluidas: ["INTERVENTORIA", "PTAP"] }), PROCESO);
      expect(r.motivo).toBe("palabra_excluida");
      expect(r.evidencia.termino).toBe("PTAP");
    },
    entidad_no_listada: () => {
      const r = evaluarFiltro(f({ entidadesNit: ["900123456"] }), PROCESO);
      expect(r.motivo).toBe("entidad_no_listada");
      expect(r.evidencia.entidadProceso).toBe("890399011");
    },
    fuera_de_zona: () => {
      const r = evaluarFiltro(f({ divipola: ["76"] }), PROCESO);
      expect(r.motivo).toBe("fuera_de_zona");
      expect(r.evidencia.divipolaProceso).toBe("05001");
    },
    modalidad_no_listada: () => {
      const r = evaluarFiltro(f({ modalidades: ["Contratación directa"] }), PROCESO);
      expect(r.motivo).toBe("modalidad_no_listada");
    },
    fuera_de_cuantia: () => {
      const r = evaluarFiltro(f({ valorMin: "1000000000.00" }), PROCESO);
      expect(r.motivo).toBe("fuera_de_cuantia");
      expect(r.evidencia.valor).toBe("800000000.00");
    },
  };

  for (const [motivo, caso] of Object.entries(casos)) {
    it(`registra ${motivo}`, caso);
  }

  it("todos los motivos de la capa 'filtro' tienen caso", () => {
    // Añadir un motivo sin probarlo deja su rama sin cubrir, y una rama sin
    // cubrir en este módulo es una licitación que desaparece en silencio.
    const deIngesta: MotivoDescarte[] = ["sin_unspsc_ni_keyword", "segmento_80_excluido"];
    const probados = new Set([...Object.keys(casos), ...deIngesta]);
    expect([...MOTIVOS].filter((m) => !probados.has(m))).toEqual([]);
  });
});

describe("evaluarFiltro — decisiones conservadoras", () => {
  it("un proceso SIN valor estimado no se descarta por cuantía", () => {
    // La fuente publica `precio_base = 0` con frecuencia; castigar ese hueco
    // escondería procesos reales. Ante la duda, mostrar.
    const sinValor = { ...PROCESO, valorEstimado: null };
    expect(evaluarFiltro(f({ valorMin: "1000000000.00" }), sinValor).motivo).toBeNull();
  });

  it("una zona de 2 dígitos cubre el departamento entero", () => {
    expect(evaluarFiltro(f({ divipola: ["05"] }), PROCESO).motivo).toBeNull();
  });

  it("la modalidad se compara sin distinguir mayúsculas", () => {
    expect(evaluarFiltro(f({ modalidades: ["LICITACIÓN PÚBLICA"] }), PROCESO).motivo).toBeNull();
  });

  it("la palabra excluida veta aunque haya coincidencia positiva", () => {
    const r = evaluarFiltro(
      f({ palabrasClave: ["ACUEDUCTO"], palabrasExcluidas: ["PTAP"] }),
      PROCESO
    );
    expect(r.motivo).toBe("palabra_excluida");
  });
});
