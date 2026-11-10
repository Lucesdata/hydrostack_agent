import { describe, it, expect } from "vitest";
import {
  type CoincidenciaComercial,
  type ExclusionComercial,
  calidadDeEvidencia,
  emparejar,
  ordenarCoincidencias,
  PESOS,
  VERSION_ALGORITMO_MATCHING,
  type EmpresaMatching,
  type ObjetivoMatching,
} from "@/src/lib/matching-comercial/matching";
import { clasificarTecnologia } from "@/src/lib/tecnologia/clasificador";
import { NODOS_TECNOLOGIA } from "@/src/lib/tecnologia/taxonomia-v1";

const empresa = (extra: Partial<EmpresaMatching> = {}): EmpresaMatching => ({
  id: "e1",
  roles: ["fabricante_internacional"],
  verificacion: "sin_verificar",
  capacidades: [
    { nodoCodigo: "BOM.SUM", estadoDato: "declarado", marcas: ["Acme"], especificaciones: null },
  ],
  cobertura: ["76"],
  coberturaNacional: false,
  atributos: {},
  ...extra,
});

const necesidad = (extra: Partial<ObjetivoMatching> = {}): ObjetivoMatching => ({
  id: "n1",
  tipo: "necesidad",
  nodoCodigo: "BOM.SUM",
  tipoProyecto: "ptar",
  divipola: "76001",
  especificaciones: null,
  evidencias: [
    { tipoFuente: "secop_campo", verificada: true, campo: "objeto", cita: "…BOMBAS SUMERGIBLES…" },
  ],
  estadoNecesidad: "inferida",
  contratoVigente: true,
  ...extra,
});

function ok(e: EmpresaMatching, o: ObjetivoMatching) {
  const r = emparejar(e, o);
  if (r.excluido) throw new Error(`Esperaba coincidencia, fue excluido: ${r.motivo}`);
  return r as CoincidenciaComercial;
}
function excluido(e: EmpresaMatching, o: ObjetivoMatching) {
  const r = emparejar(e, o);
  if (!r.excluido) throw new Error("Esperaba exclusión");
  return r as ExclusionComercial;
}

describe("afinidad técnica", () => {
  it("coincidencia exacta de categoría + tipo de proyecto compatible", () => {
    const r = ok(empresa(), necesidad());
    // 60 exacta + 10 tipo de proyecto; sin especificaciones ni capacidad documentada.
    expect(r.afinidad).toBe(PESOS.exacta + PESOS.tipoProyecto);
  });

  it("una capacidad documentada suma; solo declarada no", () => {
    const doc = ok(
      empresa({
        capacidades: [
          { nodoCodigo: "BOM.SUM", estadoDato: "documentado", marcas: [], especificaciones: null },
        ],
      }),
      necesidad()
    );
    expect(doc.afinidad).toBe(PESOS.exacta + PESOS.tipoProyecto + PESOS.documentada);
  });

  it("la familia padre o hija vale menos que la exacta; la hermana, menos aún", () => {
    const padre = ok(
      empresa({
        capacidades: [
          { nodoCodigo: "BOM", estadoDato: "declarado", marcas: [], especificaciones: null },
        ],
      }),
      necesidad()
    );
    const hermana = ok(
      empresa({
        capacidades: [
          { nodoCodigo: "BOM.DOS", estadoDato: "declarado", marcas: [], especificaciones: null },
        ],
      }),
      necesidad()
    );
    const exacta = ok(empresa(), necesidad());
    expect(padre.afinidad).toBe(PESOS.relacionada + PESOS.tipoProyecto);
    expect(hermana.afinidad).toBe(PESOS.hermana + PESOS.tipoProyecto);
    expect(exacta.afinidad).toBeGreaterThan(padre.afinidad);
    expect(padre.afinidad).toBeGreaterThan(hermana.afinidad);
  });

  it("falso positivo: una categoría sin relación NO coincide, aunque comparta tipo de proyecto", () => {
    const r = excluido(
      empresa({
        capacidades: [
          { nodoCodigo: "INS", estadoDato: "verificado", marcas: [], especificaciones: null },
        ],
      }),
      necesidad()
    );
    expect(r.motivo).toBe("sin_afinidad_tecnica");
  });

  it("especificaciones: solo puntúan si AMBAS partes las declaran, y los máximos/mínimos se leen en su sentido", () => {
    const e = empresa({
      capacidades: [
        {
          nodoCodigo: "BOM.SUM",
          estadoDato: "declarado",
          marcas: [],
          especificaciones: { caudal_max_m3h: 200, voltaje: 220 },
        },
      ],
    });
    const sin = ok(e, necesidad());
    const con = ok(e, necesidad({ especificaciones: { caudal_max_m3h: 120, voltaje: 220 } }));
    expect(con.afinidad - sin.afinidad).toBe(PESOS.especificaciones);
    const parcial = ok(e, necesidad({ especificaciones: { caudal_max_m3h: 120, voltaje: 110 } }));
    expect(parcial.afinidad - sin.afinidad).toBe(PESOS.especificaciones / 2);
    expect(parcial.explicacion.restricciones.map((x) => x.codigo)).toContain(
      "especificacion_no_compatible"
    );
    const insuficiente = ok(e, necesidad({ especificaciones: { caudal_max_m3h: 500 } }));
    expect(insuficiente.afinidad).toBe(sin.afinidad);
  });

  it("sin especificaciones en la necesidad, el tope de una inferida es 80 y se dice por qué falta", () => {
    const e = empresa({
      capacidades: [
        { nodoCodigo: "BOM.SUM", estadoDato: "verificado", marcas: [], especificaciones: { a: 1 } },
      ],
    });
    const r = ok(e, necesidad());
    expect(r.afinidad).toBeLessThanOrEqual(100 - PESOS.especificaciones);
    expect(r.explicacion.faltaConfirmar.map((x) => x.codigo)).toContain(
      "especificaciones_sin_comparar"
    );
  });
});

describe("compuertas duras (excluyen y explican)", () => {
  it("contratos cerrados o no vigentes", () => {
    expect(excluido(empresa(), necesidad({ contratoVigente: false })).motivo).toBe(
      "contrato_no_vigente"
    );
  });

  it("necesidades descartadas, suspendidas o cerradas", () => {
    for (const estadoNecesidad of ["descartada", "suspendida", "cerrada"] as const) {
      expect(excluido(empresa(), necesidad({ estadoNecesidad })).motivo).toBe(
        "necesidad_no_vigente"
      );
    }
  });

  it("una licitación que ya no recibe ofertas no es una oportunidad", () => {
    const o = necesidad({
      tipo: "proceso",
      estadoNecesidad: undefined,
      contratoVigente: undefined,
      recibeOfertas: false,
    });
    expect(excluido(empresa(), o).motivo).toBe("proceso_no_abierto");
    expect(ok(empresa(), { ...o, recibeOfertas: true }).demanda.estado).toBe(
      "convocatoria_abierta"
    );
  });

  it("territorio: fuera de la cobertura declarada se excluye; sin cobertura declarada no", () => {
    expect(excluido(empresa({ cobertura: ["05"] }), necesidad({ divipola: "76001" })).motivo).toBe(
      "sin_cobertura"
    );
    expect(
      ok(empresa({ cobertura: ["76001"] }), necesidad({ divipola: "76001" })).afinidad
    ).toBeGreaterThan(0);
    expect(
      ok(empresa({ cobertura: ["76"] }), necesidad({ divipola: "76001" })).afinidad
    ).toBeGreaterThan(0);
    expect(
      ok(empresa({ cobertura: [], coberturaNacional: true }), necesidad({ divipola: "05001" }))
        .afinidad
    ).toBeGreaterThan(0);
    const sinCob = ok(empresa({ cobertura: [] }), necesidad());
    expect(sinCob.explicacion.faltaConfirmar.map((x) => x.codigo)).toContain(
      "cobertura_no_declarada"
    );
  });

  it("una cobertura municipal cubre un objetivo departamental; ubicación desconocida no excluye", () => {
    expect(
      ok(empresa({ cobertura: ["76001"] }), necesidad({ divipola: "76" })).afinidad
    ).toBeGreaterThan(0);
    const r = ok(empresa(), necesidad({ divipola: null }));
    expect(r.explicacion.faltaConfirmar.map((x) => x.codigo)).toContain("ubicacion_desconocida");
  });

  it("actividad: un fabricante no se ofrece a un servicio, ni una consultora a un bien", () => {
    expect(excluido(empresa(), necesidad({ nodoCodigo: "ING", tipoProyecto: null })).motivo).toBe(
      "actividad_incompatible"
    );
    const consultora = empresa({
      roles: ["consultora"],
      capacidades: [
        { nodoCodigo: "BOM.SUM", estadoDato: "declarado", marcas: [], especificaciones: null },
      ],
    });
    expect(excluido(consultora, necesidad()).motivo).toBe("actividad_incompatible");
    // Un integrador tecnológico sirve a ambos; una categoría mixta acepta a cualquiera.
    const integrador = empresa({
      roles: ["integrador_tecnologico"],
      capacidades: [
        { nodoCodigo: "ING", estadoDato: "declarado", marcas: [], especificaciones: null },
      ],
    });
    expect(
      ok(integrador, necesidad({ nodoCodigo: "ING", tipoProyecto: null })).afinidad
    ).toBeGreaterThan(0);
    const mixta = empresa({
      roles: ["consultora"],
      capacidades: [
        { nodoCodigo: "SCA", estadoDato: "declarado", marcas: [], especificaciones: null },
      ],
    });
    expect(
      ok(mixta, necesidad({ nodoCodigo: "SCA", tipoProyecto: null })).afinidad
    ).toBeGreaterThan(0);
  });

  it("una empresa rechazada o revocada no recibe coincidencias", () => {
    for (const verificacion of ["rechazada", "revocada"] as const) {
      expect(excluido(empresa({ verificacion }), necesidad()).motivo).toBe("empresa_no_habilitada");
    }
    expect(ok(empresa({ verificacion: "en_revision" }), necesidad()).afinidad).toBeGreaterThan(0);
  });

  it("toda exclusión trae su explicación y ninguna coincidencia falsa", () => {
    const r = excluido(empresa({ cobertura: ["05"] }), necesidad());
    expect(r.explicacion.queCoincide).toEqual([]);
    expect(r.explicacion.porQue.length).toBeGreaterThan(0);
  });
});

describe("calidad de evidencia: independiente de la afinidad", () => {
  it("A: pliego o documento con cita verificada", () => {
    expect(calidadDeEvidencia([{ tipoFuente: "pliego_usuario", verificada: true }])).toBe("A");
    expect(calidadDeEvidencia([{ tipoFuente: "documento_oficial", verificada: true }])).toBe("A");
  });
  it("un pliego con la cita sin verificar NO es A", () => {
    expect(calidadDeEvidencia([{ tipoFuente: "pliego_usuario", verificada: false }])).toBe("D");
  });
  it("B: campo estructurado de SECOP; C: texto libre corto; D: solo inferencia o nada", () => {
    expect(
      calidadDeEvidencia([{ tipoFuente: "secop_campo", verificada: true, campo: "unspsc" }])
    ).toBe("B");
    expect(
      calidadDeEvidencia([{ tipoFuente: "secop_campo", verificada: true, campo: "objeto" }])
    ).toBe("C");
    expect(calidadDeEvidencia([{ tipoFuente: "inferencia", verificada: false }])).toBe("D");
    expect(calidadDeEvidencia([])).toBe("D");
  });
  it("gana la mejor evidencia disponible", () => {
    expect(
      calidadDeEvidencia([
        { tipoFuente: "inferencia", verificada: false },
        { tipoFuente: "secop_campo", verificada: true, campo: "objeto" },
        { tipoFuente: "pliego_usuario", verificada: true },
      ])
    ).toBe("A");
  });

  it("la evidencia NO cambia la afinidad ni la afinidad cambia la calidad", () => {
    const sin = ok(empresa(), necesidad({ evidencias: [] }));
    const con = ok(
      empresa(),
      necesidad({ evidencias: [{ tipoFuente: "pliego_usuario", verificada: true }] })
    );
    expect(con.afinidad).toBe(sin.afinidad);
    expect(sin.calidadEvidencia).toBe("D");
    expect(con.calidadEvidencia).toBe("A");
  });

  it("documentos incompletos: sin evidencia se dice y se pide confirmar, sin inventar", () => {
    const r = ok(empresa(), necesidad({ evidencias: [] }));
    expect(r.explicacion.evidencias).toEqual([]);
    const falta = r.explicacion.faltaConfirmar.map((x) => x.codigo);
    expect(falta).toContain("evidencia_debil");
  });
});

describe("demanda: una etiqueta, no un puntaje", () => {
  it("refleja el estado de la necesidad y avisa si no está confirmada", () => {
    expect(ok(empresa(), necesidad({ estadoNecesidad: "inferida" })).demanda.estado).toBe(
      "inferida"
    );
    const r = ok(empresa(), necesidad({ estadoNecesidad: "inferida" }));
    expect(r.explicacion.faltaConfirmar.map((x) => x.codigo)).toContain("demanda_sin_confirmar");
    const conf = ok(empresa(), necesidad({ estadoNecesidad: "confirmada" }));
    expect(conf.explicacion.faltaConfirmar.map((x) => x.codigo)).not.toContain(
      "demanda_sin_confirmar"
    );
  });

  it("la demanda no suma a la afinidad", () => {
    const a = ok(empresa(), necesidad({ estadoNecesidad: "inferida" })).afinidad;
    const b = ok(empresa(), necesidad({ estadoNecesidad: "abierta" })).afinidad;
    expect(a).toBe(b);
  });

  it("responder una necesidad abierta está deshabilitado hasta que exista el flujo de cotización", () => {
    const r = ok(empresa(), necesidad({ estadoNecesidad: "abierta" }));
    const paso = r.explicacion.pasos.find((p) => p.paso === "solicitar_cotizacion");
    expect(paso?.disponible).toBe(false);
  });
});

describe("explicación completa y honestidad", () => {
  it("trae qué coincide, por qué, documentos, qué falta, restricciones y pasos", () => {
    const r = ok(empresa(), necesidad());
    for (const k of [
      "queCoincide",
      "porQue",
      "evidencias",
      "faltaConfirmar",
      "restricciones",
      "pasos",
    ] as const) {
      expect(r.explicacion[k]).toBeDefined();
    }
    expect(r.explicacion.queCoincide.length).toBeGreaterThan(0);
    expect(r.explicacion.porQue.length).toBeGreaterThan(0);
    expect(r.explicacion.restricciones.map((x) => x.codigo)).toContain("decide_el_contratista");
  });

  it("lista la evidencia con su cita y su procedencia", () => {
    const r = ok(empresa(), necesidad());
    expect(r.explicacion.evidencias[0]).toMatchObject({
      tipoFuente: "secop_campo",
      verificada: true,
      cita: "…BOMBAS SUMERGIBLES…",
    });
  });

  it("el score NO es una probabilidad: el resultado no la expone ni la insinúa", () => {
    const r = ok(empresa(), necesidad()) as unknown as Record<string, unknown>;
    expect(Object.keys(r).some((k) => /probab|chance|likel|exito|win/i.test(k))).toBe(false);
    expect(r.afinidad).toBeGreaterThanOrEqual(0);
    expect(r.afinidad).toBeLessThanOrEqual(100);
  });

  it("soporte, documentación y condiciones comerciales desconocidas se listan, no restan en silencio", () => {
    const base = ok(empresa(), necesidad());
    const falta = base.explicacion.faltaConfirmar.map((x) => x.codigo);
    expect(falta).toEqual(
      expect.arrayContaining([
        "soporte_posventa_no_declarado",
        "capacidad_solo_declarada",
        "condiciones_comerciales_desconocidas",
      ])
    );
    const completo = ok(
      empresa({
        capacidades: [
          { nodoCodigo: "BOM.SUM", estadoDato: "verificado", marcas: [], especificaciones: null },
        ],
        atributos: {
          soporte_tecnico: ["24/7"],
          monedas: ["USD"],
          garantias: ["24 meses"],
          condiciones_importacion_entrega: ["CIF"],
        },
      }),
      necesidad()
    );
    expect(completo.afinidad).toBeGreaterThan(base.afinidad);
    const f2 = completo.explicacion.faltaConfirmar.map((x) => x.codigo);
    expect(f2).not.toContain("soporte_posventa_no_declarado");
    expect(f2).not.toContain("condiciones_comerciales_desconocidas");
  });

  it("es determinista y no muta sus entradas", () => {
    const e = empresa();
    const o = necesidad();
    const copia = JSON.stringify([e, o]);
    expect(emparejar(e, o)).toEqual(emparejar(e, o));
    expect(JSON.stringify([e, o])).toBe(copia);
    expect(ok(e, o).versionAlgoritmo).toBe(VERSION_ALGORITMO_MATCHING);
  });
});

describe("ordenarCoincidencias", () => {
  it("ordena por afinidad y, a igualdad, por calidad de evidencia y luego por id", () => {
    const e = empresa();
    const rs = [
      { id: "z", r: ok(e, necesidad({ id: "z", evidencias: [] })) },
      {
        id: "a",
        r: ok(
          e,
          necesidad({ id: "a", evidencias: [{ tipoFuente: "pliego_usuario", verificada: true }] })
        ),
      },
      { id: "m", r: ok(e, necesidad({ id: "m", nodoCodigo: "BOM", evidencias: [] })) },
    ];
    expect(ordenarCoincidencias(rs.map((x) => ({ id: x.id, ...x.r }))).map((x) => x.id)).toEqual([
      "a",
      "z",
      "m",
    ]);
  });
});

describe("integración con el clasificador (CI-01)", () => {
  it("una mención negada no genera candidato y por tanto no hay con qué emparejar", () => {
    const texto = "El contrato no incluye el suministro de bombas sumergibles";
    expect(clasificarTecnologia(texto).candidatos).toEqual([]);
  });

  it("un candidato inferido del clasificador empareja con evidencia C y estado inferida", () => {
    const [c] = clasificarTecnologia(
      "Suministro de bombas sumergibles para la estación"
    ).candidatos;
    const o = necesidad({
      nodoCodigo: c.codigo,
      evidencias: [{ tipoFuente: "secop_campo", verificada: true, campo: "objeto", cita: c.cita }],
    });
    const r = ok(empresa(), o);
    expect(r.calidadEvidencia).toBe("C");
    expect(r.demanda.estado).toBe("inferida");
  });
});

describe("propiedades sobre toda la taxonomía", () => {
  it("para cualquier par de categorías la afinidad está en 0–100 y no depende de la evidencia ni de la demanda", () => {
    for (const a of NODOS_TECNOLOGIA) {
      for (const b of NODOS_TECNOLOGIA) {
        const e = empresa({
          roles: ["integrador_tecnologico"],
          capacidades: [
            { nodoCodigo: a.codigo, estadoDato: "verificado", marcas: [], especificaciones: null },
          ],
        });
        const sinEv = emparejar(
          e,
          necesidad({ nodoCodigo: b.codigo, evidencias: [], estadoNecesidad: "inferida" })
        );
        const conEv = emparejar(
          e,
          necesidad({
            nodoCodigo: b.codigo,
            evidencias: [{ tipoFuente: "pliego_usuario", verificada: true }],
            estadoNecesidad: "abierta",
          })
        );
        expect(sinEv.excluido).toBe(conEv.excluido);
        if (!sinEv.excluido && !conEv.excluido) {
          expect(sinEv.afinidad).toBeGreaterThanOrEqual(0);
          expect(sinEv.afinidad).toBeLessThanOrEqual(100);
          expect(conEv.afinidad).toBe(sinEv.afinidad);
        }
      }
    }
  });
});
