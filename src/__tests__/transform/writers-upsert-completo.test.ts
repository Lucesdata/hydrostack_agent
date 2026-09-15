import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getTableColumns } from "drizzle-orm";
import { proceso } from "@/src/lib/db/schema";
import { columnasTipoProyecto } from "@/src/lib/transform/writers";
import type { ProcesoProjection } from "@/src/lib/transform/mapCanonical";

/**
 * El invariante que `writers.ts` declara en su cabecera: «re-escribir TODAS las
 * columnas no-PK en UPDATE (vía `excluded.*`) evita columnas zombi».
 *
 * Estaba escrito pero no comprobado, y por eso una columna nueva podía quedarse
 * fuera del `onConflictDoUpdate` sin que nadie se enterara: los INSERT la
 * llenaban y los UPDATE la dejaban congelada con el valor de la primera corrida.
 * Un proceso que cambia de fase conservaría la clasificación vieja para siempre.
 *
 * Se comprueba leyendo el fuente porque el `set` del upsert no es inspeccionable
 * en tiempo de ejecución sin montar una base. Es tosco y es mucho mejor que nada.
 */

const fuente = readFileSync(join(process.cwd(), "src/lib/transform/writers.ts"), "utf8");

/**
 * Las excepciones deliberadas, con su motivo. Cualquier columna que no esté
 * aquí y no se reescriba hace fallar la prueba — que es el punto.
 */
const NO_SE_REESCRIBEN: Record<string, string> = {
  id: "PK generada",
  secop_proceso_id: "clave natural del ON CONFLICT",
  created_at: "fecha de alta: no se toca al actualizar",
  updated_at: "se pone a now(), no a excluded",
  entidad_id: "FK opcional: coalesce para no borrar la resuelta en otra corrida",
  deleted_at: "soft delete, lo gobierna otro paso",
};

describe("upsert de proceso", () => {
  it("reescribe en UPDATE todas las columnas que no son excepción documentada", () => {
    const columnas = Object.values(getTableColumns(proceso)).map((c) => c.name);
    // Por palabra completa, no por subcadena: `excluded.tipo_proyecto` vive
    // dentro de `excluded.tipo_proyecto_confianza`, así que un `includes` daba
    // por cubierta una columna ausente. La primera versión de esta prueba tenía
    // ese fallo y no detectaba nada.
    const seReescribe = (nombre: string) => new RegExp(`excluded\\.${nombre}\\b`).test(fuente);
    const olvidadas = columnas.filter(
      (nombre) => !(nombre in NO_SE_REESCRIBEN) && !seReescribe(nombre)
    );
    expect(
      olvidadas,
      `estas columnas se insertan pero nunca se actualizan: ${olvidadas.join(", ")}`
    ).toEqual([]);
  });
});

describe("columnasTipoProyecto", () => {
  const base: ProcesoProjection = {
    secopProcesoId: "CO1.REQ.1",
    portafolioId: null,
    referencia: null,
    modalidad: null,
    tipoContrato: null,
    objeto: null,
    valorEstimado: null,
    fechaPublicacion: null,
    estadoActual: null,
    estadoCodigo: null,
    descripcion: null,
    url: null,
    unspsc: null,
    fase: null,
    adjudicado: null,
    valorAdjudicacion: null,
    adjudicatario: null,
    nitAdjudicatario: null,
    fechaAdjudicacion: null,
    estadoApertura: null,
    fechaRecepcion: null,
    entidad: null,
  } as ProcesoProjection;

  it("produce las cuatro columnas, y sus nombres existen en la tabla", () => {
    const cols = columnasTipoProyecto({ ...base, objeto: "CONSTRUCCIÓN DE LA PTAR MUNICIPAL" });
    const validas = new Set(Object.keys(getTableColumns(proceso)));
    for (const k of Object.keys(cols)) expect(validas.has(k)).toBe(true);
    expect(cols.tipoProyecto).toBe("ptar");
  });

  it("usa el nombre de la entidad para podar, no como evidencia", () => {
    // Sin la poda, esto puntuaría como acueducto. Es el fallo que justifica
    // pasar la entidad hasta aquí.
    const cols = columnasTipoProyecto({
      ...base,
      objeto: "SUMINISTRO DE 21.100 FORMATOS DE FACTURA",
      descripcion:
        "PARA EL RECAUDO DE LOS SERVICIOS PÚBLICOS DOMICILIARIOS DE ACUEDUCTO Y ALCANTARILLADO",
      entidad: { nombre: "EMPRESA DE ACUEDUCTO, ALCANTARILLADO Y ASEO DE SAN ALBERTO" },
    } as ProcesoProjection);
    expect(cols.tipoProyecto).toBe("otros");
  });

  it("clasifica por la descripción cuando el objeto es un código", () => {
    const cols = columnasTipoProyecto({
      ...base,
      objeto: "INVITACIÓN PRIVADA 016 DE 2023",
      descripcion: "CONSTRUCCIÓN DE LA SEGUNDA ETAPA DEL SISTEMA DE ACUEDUCTO DEL BARRIO",
    });
    expect(cols.tipoProyecto).toBe("acueducto");
  });

  it("nunca deja el tipo en null: sin texto, `otros`", () => {
    expect(columnasTipoProyecto(base).tipoProyecto).toBe("otros");
  });
});
