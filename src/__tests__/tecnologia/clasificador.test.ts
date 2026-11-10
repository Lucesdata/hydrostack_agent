import { describe, it, expect } from "vitest";
import { TIPOS_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import { NODOS_TECNOLOGIA, NODO_POR_CODIGO, NEGADORES } from "@/src/lib/tecnologia/taxonomia-v1";
import { clasificarTecnologia } from "@/src/lib/tecnologia/clasificador";

const codigos = (texto: string) => clasificarTecnologia(texto).candidatos.map((c) => c.codigo);

describe("integridad de la taxonomía v1", () => {
  it("tiene 18 raíces y códigos únicos", () => {
    const raices = NODOS_TECNOLOGIA.filter((n) => n.padre === null);
    expect(raices).toHaveLength(18);
    expect(new Set(NODOS_TECNOLOGIA.map((n) => n.codigo)).size).toBe(NODOS_TECNOLOGIA.length);
  });

  it("cada padre existe y es raíz", () => {
    for (const n of NODOS_TECNOLOGIA.filter((x) => x.padre)) {
      expect(NODO_POR_CODIGO[n.padre as string]?.padre).toBeNull();
    }
  });

  it("solo usa los cinco tipos de proyecto", () => {
    for (const n of NODOS_TECNOLOGIA) {
      expect(n.tipos.length).toBeGreaterThan(0);
      for (const t of n.tipos) expect(TIPOS_PROYECTO).toContain(t);
    }
  });

  it("cada nodo trae términos en español e inglés, ya normalizados", () => {
    for (const n of NODOS_TECNOLOGIA) {
      expect(n.es.length, n.codigo).toBeGreaterThan(0);
      expect(n.en.length, n.codigo).toBeGreaterThan(0);
      for (const termino of [...n.es, ...n.en]) {
        expect(termino, `${n.codigo}:${termino}`).toBe(termino.toLowerCase());
        expect(termino).toBe(termino.normalize("NFD").replace(/\p{Diacritic}/gu, ""));
      }
    }
  });

  it("ningún término se repite entre nodos", () => {
    const vistos = new Map<string, string>();
    for (const n of NODOS_TECNOLOGIA) {
      for (const termino of [...n.es, ...n.en]) {
        expect(
          vistos.get(termino),
          `${termino} en ${n.codigo} y ${vistos.get(termino)}`
        ).toBeUndefined();
        vistos.set(termino, n.codigo);
      }
    }
  });

  it("no hay términos de una sola palabra genérica", () => {
    const prohibidos = [
      "bomba",
      "bombas",
      "valvula",
      "valvulas",
      "sistema",
      "tuberia",
      "filtro",
      "equipo",
    ];
    for (const n of NODOS_TECNOLOGIA) {
      for (const termino of [...n.es, ...n.en]) expect(prohibidos).not.toContain(termino);
    }
  });

  it("los negadores no incluyen palabras demasiado comunes", () => {
    expect(NEGADORES).not.toContain("no");
    expect(NEGADORES).not.toContain("ni");
  });
});

describe("clasificarTecnologia", () => {
  it("detecta una bomba sumergible y devuelve la cita literal del original", () => {
    const texto = "Suministro de BOMBAS SUMERGIBLES para la estación de rebombeo";
    const r = clasificarTecnologia(texto);
    const c = r.candidatos.find((x) => x.codigo === "BOM.SUM");
    expect(c).toBeDefined();
    expect(c?.cita).toBe("BOMBAS SUMERGIBLES");
    expect(texto.slice(c!.inicio, c!.fin)).toBe(c!.cita);
  });

  it("sale siempre como inferida con calidad C: este módulo no promueve estados", () => {
    const r = clasificarTecnologia("Suministro de caudalímetros electromagnéticos");
    expect(r.candidatos.length).toBeGreaterThan(0);
    for (const c of r.candidatos) {
      expect(c.estado).toBe("inferida");
      expect(c.calidadEvidencia).toBe("C");
    }
  });

  it("ignora las tildes y funciona en inglés", () => {
    expect(codigos("Instalación de variador de frecuencia")).toContain("AUT");
    expect(codigos("Supply of ultrafiltration membranes")).toContain("MEM");
    expect(codigos("Supervisory control upgrade")).toContain("SCA");
  });

  it("no se deja engañar por palabras que contienen el término (falso positivo)", () => {
    expect(codigos("Dotación para el cuerpo de bomberos del municipio")).toEqual([]);
    expect(codigos("Compra de simplcity para oficina")).not.toContain("SCA");
    expect(codigos("Tuberías del scadalogo")).not.toContain("SCA");
  });

  it("una referencia genérica a «bomba» no genera candidato", () => {
    expect(codigos("Bomba de gasolina para vehículo de la alcaldía")).toEqual([]);
  });

  it("descarta los términos negados y los conserva como descartados", () => {
    const r = clasificarTecnologia("El contrato no incluye el suministro de bombas sumergibles");
    expect(r.candidatos.map((c) => c.codigo)).not.toContain("BOM.SUM");
    expect(r.descartados).toEqual([
      expect.objectContaining({ codigo: "BOM.SUM", motivo: "negado", negador: "no incluye" }),
    ]);
  });

  it("«sin» y «excepto» niegan dentro de la cláusula", () => {
    expect(codigos("Mantenimiento sin suministro de bombas centrífugas")).not.toContain("BOM.CEN");
    expect(codigos("Obra civil excepto osmosis inversa")).not.toContain("MEM");
  });

  it("la negación no cruza una cláusula distinta", () => {
    expect(
      codigos("El contrato no incluye interventoría. Suministro de bombas sumergibles")
    ).toContain("BOM.SUM");
    expect(codigos("Sin embargo, se instalarán electrobombas")).toContain("BOM");
  });

  it("un hijo con evidencia desplaza a su padre", () => {
    const r = codigos("Estación de bombeo con bombas sumergibles");
    expect(r).toContain("BOM.SUM");
    expect(r).not.toContain("BOM");
  });

  it("sin hijo, el padre se informa", () => {
    expect(codigos("Rehabilitación de la estación de bombeo")).toContain("BOM");
  });

  it("devuelve varias tecnologías ordenadas por posición", () => {
    const r = clasificarTecnologia(
      "Suministro de caudalímetros y sistema scada para la planta"
    ).candidatos;
    expect(r.map((c) => c.codigo)).toEqual(["INS", "SCA"]);
  });

  it("entrada vacía, nula o sin coincidencias da resultado vacío", () => {
    for (const x of [null, undefined, "", "   ", "Contratación de papelería"]) {
      expect(clasificarTecnologia(x)).toEqual({ candidatos: [], descartados: [] });
    }
  });

  it("es determinista entre corridas", () => {
    const t = "Suministro e instalación de variadores de frecuencia y bombas dosificadoras";
    expect(clasificarTecnologia(t)).toEqual(clasificarTecnologia(t));
  });

  it("no inventa datos: el candidato no trae cantidad, precio ni fecha", () => {
    const [c] = clasificarTecnologia("Suministro de 12 turbidímetros por $50.000.000").candidatos;
    expect(c).toBeDefined();
    expect(Object.keys(c)).not.toEqual(expect.arrayContaining(["cantidad"]));
    expect(Object.keys(c).some((k) => /precio|valor|fecha|cantidad/i.test(k))).toBe(false);
  });
});

describe("CI-01b: lagunas y falsos positivos de contexto del spike CI-02", () => {
  it("reconoce los bienes que el v1 no veía", () => {
    expect(
      codigos("Mantenimiento de trampas grasas, tanques de almacenamiento, MOTO BOMBAS y bebederos")
    ).toContain("BOM");
    expect(codigos("Adquisición de equipos de medición para el laboratorio ambiental")).toContain(
      "INS"
    );
    expect(
      codigos("Optimizar el recurso con la medición de caudales en los acueductos rurales")
    ).toContain("INS");
    expect(
      codigos("Instalación de sistemas prefabricados tipo tanque séptico en zona rural")
    ).toContain("BIO");
    expect(codigos("Suministro de insumos químicos para la planta")).toContain("QUI");
    expect(codigos("Suministro de motobombas sumergibles")).toEqual(["BOM.SUM"]);
  });

  it("el sistema de filtración de AIRE no es filtración de agua", () => {
    const r = clasificarTecnologia(
      "Suministro e instalación de un sistema de filtración de aire del laboratorio"
    );
    expect(r.candidatos.map((c) => c.codigo)).not.toContain("FIL");
    expect(r.descartados).toEqual([
      expect.objectContaining({ codigo: "FIL", motivo: "contexto", negador: "de aire" }),
    ]);
    expect(codigos("Instalación de un sistema de filtración de agua cruda")).toContain("FIL");
  });

  it("un servicio que es solo el destino de un suministro no se infiere", () => {
    const r = clasificarTecnologia(
      "Suministro de herramientas manuales para el mantenimiento de la planta de tratamiento"
    );
    expect(r.candidatos.map((c) => c.codigo)).not.toContain("OYM");
    expect(r.descartados).toEqual([expect.objectContaining({ codigo: "OYM", motivo: "destino" })]);
  });

  it("pero el servicio contratado como tal sí se infiere, y los repuestos también", () => {
    expect(codigos("Contratar el mantenimiento preventivo de la planta de tratamiento")).toContain(
      "OYM"
    );
    expect(codigos("Suministro de repuestos para agitadores de lodos")).toEqual(["OYM", "ELM"]);
  });
});
