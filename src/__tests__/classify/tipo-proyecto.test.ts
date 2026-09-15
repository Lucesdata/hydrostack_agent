import { describe, it, expect } from "vitest";
import {
  CLASIFICADOR_TIPO_VERSION,
  TIPOS_PROYECTO,
  TIPO_POR_SLUG,
  TIPO_PROYECTO,
  clasificarTipoProyecto,
} from "@/src/lib/classify/tipo-proyecto";

/**
 * Cada caso de este archivo salió de mirar filas reales de la base, no de
 * imaginar entradas. Los que fijan un fallo concreto llevan el recuento de
 * cuántas filas de las 90.622 estaban afectadas: sin ese número es imposible
 * saber si una regla merece existir.
 */

describe("la taxonomía", () => {
  it("tiene exactamente cinco valores y `otros` va al final", () => {
    expect(TIPOS_PROYECTO).toHaveLength(5);
    expect(TIPOS_PROYECTO.at(-1)).toBe("otros");
  });

  it("da una entrada de metadatos por tipo, sin slugs repetidos", () => {
    const slugs = TIPOS_PROYECTO.map((t) => TIPO_PROYECTO[t].slug);
    expect(new Set(slugs).size).toBe(TIPOS_PROYECTO.length);
  });

  it("resuelve slug → tipo en los dos sentidos", () => {
    for (const tipo of TIPOS_PROYECTO) {
      expect(TIPO_POR_SLUG[TIPO_PROYECTO[tipo].slug]).toBe(tipo);
    }
  });
});

describe("las plantas ganan a las redes", () => {
  // El spec lo exige: ptap y ptar no se solapan con acueducto ni alcantarillado.
  it("una PTAP no se clasifica como acueducto aunque diga «agua potable»", () => {
    const r = clasificarTipoProyecto({
      objeto: "OPTIMIZACIÓN DE LA PLANTA DE TRATAMIENTO DE AGUA POTABLE (PTAP) DEL MUNICIPIO",
    });
    expect(r.tipo).toBe("ptap");
    expect(r.segundo).toBe("acueducto");
  });

  it("una PTAR no se clasifica como alcantarillado aunque nombre la red", () => {
    const r = clasificarTipoProyecto({
      objeto: "CONSTRUCCIÓN DE LA PTAR DEL SISTEMA DE ALCANTARILLADO DEL MUNICIPIO",
    });
    expect(r.tipo).toBe("ptar");
  });

  it("separa potabilización de aguas residuales: no son el mismo eje", () => {
    expect(clasificarTipoProyecto({ objeto: "planta potabilizadora municipal" }).tipo).toBe("ptap");
    expect(clasificarTipoProyecto({ objeto: "tratamiento de aguas residuales" }).tipo).toBe("ptar");
  });
});

describe("el nombre de la entidad no es evidencia", () => {
  /**
   * El fallo que justifica toda la poda. 8.559 objetos nombran una empresa de
   * servicios públicos dentro del texto; sin quitarla, imprimir facturas puntúa
   * como acueducto.
   */
  it("un contrato de facturación de una empresa de acueducto acaba en `otros`", () => {
    const r = clasificarTipoProyecto({
      objeto: "SUMINISTRO DE 21.100 FORMATOS DE FACTURA",
      descripcion:
        "PARA RECAUDAR EL CONSUMO DE LOS SERVICIOS PÚBLICOS DOMICILIARIOS DE ACUEDUCTO, ALCANTARILLADO Y ASEO",
      entidadNombre: "EMPRESA DE ACUEDUCTO, ALCANTARILLADO Y ASEO DE SAN ALBERTO",
    });
    expect(r.tipo).toBe("otros");
    expect(r.suprimido.length).toBeGreaterThan(0);
  });

  it("pero un proyecto real de esa misma entidad sigue clasificándose", () => {
    const r = clasificarTipoProyecto({
      objeto: "CONSTRUCCIÓN DE LA RED DE ACUEDUCTO DEL BARRIO LAS BRISAS",
      entidadNombre: "EMPRESA DE ACUEDUCTO, ALCANTARILLADO Y ASEO DE SAN ALBERTO",
    });
    expect(r.tipo).toBe("acueducto");
  });

  it("no poda un nombre demasiado corto, que sería una palabra suelta", () => {
    const r = clasificarTipoProyecto({
      objeto: "AMPLIACIÓN DEL ACUEDUCTO VEREDAL",
      entidadNombre: "Acueducto",
    });
    expect(r.tipo).toBe("acueducto");
    expect(r.suprimido).toEqual([]);
  });
});

describe("coincidencia por palabra completa", () => {
  // 1.890 filas decía «recolector» y salían como alcantarillado por «colector».
  it("«recolector» no dispara alcantarillado", () => {
    expect(
      clasificarTipoProyecto({ objeto: "PRESTAR LOS SERVICIOS PERSONALES COMO RECOLECTOR 1" }).tipo
    ).toBe("otros");
  });

  it("pero «colector» suelto sí", () => {
    expect(clasificarTipoProyecto({ objeto: "CONSTRUCCIÓN DEL COLECTOR PRINCIPAL" }).tipo).toBe(
      "alcantarillado"
    );
  });
});

describe("la descripción cuenta", () => {
  // En 17.246 filas el objeto es un código y el proyecto está en la descripción.
  it("clasifica por la descripción cuando el objeto es un código administrativo", () => {
    const r = clasificarTipoProyecto({
      objeto: "INVITACIÓN PRIVADA 016 DE 2023",
      descripcion:
        "CONSTRUCCIÓN DE LA SEGUNDA ETAPA DEL SISTEMA DE ACUEDUCTO DEL BARRIO LOS COMODATOS",
    });
    expect(r.tipo).toBe("acueducto");
  });
});

describe("el respaldo", () => {
  it("sin evidencia devuelve `otros`, no una adivinanza", () => {
    expect(clasificarTipoProyecto({ objeto: "PRESTACIÓN DE SERVICIOS PROFESIONALES" }).tipo).toBe(
      "otros"
    );
  });

  it("distingue «no hay texto» de «el texto habla de otra cosa»", () => {
    expect(clasificarTipoProyecto({ objeto: null }).confianza).toBe("baja");
    expect(clasificarTipoProyecto({ objeto: "COMPRA DE MEDICAMENTOS" }).confianza).toBe("media");
  });
});

describe("determinismo", () => {
  it("la misma entrada da siempre la misma salida", () => {
    const entrada = {
      objeto: "REPOSICIÓN DE REDES DE ACUEDUCTO Y ALCANTARILLADO",
      descripcion: "OBRA CIVIL",
      unspsc: "V1.83101500",
    };
    const a = clasificarTipoProyecto(entrada);
    const b = clasificarTipoProyecto(entrada);
    expect(a).toEqual(b);
  });

  it("un empate entre las dos redes se resuelve siempre igual y conserva el descartado", () => {
    // 7.496 filas caen aquí. La etiqueta es una elección estable, no una lectura:
    // por eso `segundo` guarda lo que se perdió.
    const r = clasificarTipoProyecto({
      objeto: "REPOSICIÓN DE REDES DE ACUEDUCTO Y ALCANTARILLADO",
    });
    expect(r.tipo).toBe("acueducto");
    expect(r.segundo).toBe("alcantarillado");
    expect(r.confianza).toBe("media");
  });

  it("sella la versión en el resultado, para saber qué corrida lo produjo", () => {
    expect(clasificarTipoProyecto({ objeto: "acueducto" }).version).toBe(CLASIFICADOR_TIPO_VERSION);
  });
});

describe("el UNSPSC solo desempata", () => {
  it("un código no inventa un subsistema que el texto no menciona", () => {
    // Se midió que la clase 831015 contiene los cuatro tipos: clasificar por
    // código solo sería adivinar.
    expect(
      clasificarTipoProyecto({ objeto: "COMPRA DE PAPELERÍA", unspsc: "V1.83101700" }).tipo
    ).toBe("otros");
  });
});
