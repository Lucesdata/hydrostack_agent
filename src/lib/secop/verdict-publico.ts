/**
 * Versión pública del veredicto: el resultado sin la explicación.
 *
 * Vive junto a `verdict.ts` y no en `src/lib/acceso/` a propósito — la política
 * decide *si* se redacta, este módulo sabe *cómo*. Así `politica.ts` no importa
 * tipos de SECOP y se sigue leyendo de un vistazo.
 *
 * La frontera del producto: el anónimo ve el semáforo agregado y el estado de
 * cada compuerta; el `reason` que explica ese estado pide cuenta. Con dos
 * excepciones, ambas por la misma razón —cobrar un correo por algo que no
 * ayuda quema la confianza que la frontera intenta construir:
 *
 *  1. `overall === "FAIL"`: quien no puede participar merece saber por qué sin
 *     pagar nada. No perdemos un lead; perdemos uno que no lo era para ese
 *     proceso.
 *  2. Compuertas `UNKNOWN`: en Nivel 0 `habilitacion` casi siempre lo es, y su
 *     `reason` solo dice que hace falta revisar el pliego. Redactarlo no oculta
 *     nada y hace ver el muro más grande de lo que es.
 *
 * En una frase: si no puedes participar, te decimos por qué sin pedirte nada;
 * si puedes, la explicación pide cuenta.
 *
 * En la práctica, para cualquier veredicto que produce `buildVerdict` la
 * excepción 1 no añade nada sobre "compuerta en FAIL": `aggregateGateStatuses`
 * (en `verdict.ts`) hace que `overall` sea `FAIL` en cuanto alguna compuerta
 * resuelta lo es, así que si una compuerta está en `FAIL`, `overall` también
 * — la conjunción `overall === "FAIL" && g.status === "FAIL"` se reduce a
 * `g.status === "FAIL"`. Y como `habilitacion` casi siempre es `UNKNOWN` en
 * Nivel 0, lo que de verdad se redacta hoy son las compuertas en `PASS` o
 * `WARN`; `FAIL` y `UNKNOWN` siempre conservan su `reason`. El chequeo
 * compuesto de `conservaExplicacion` se deja así (en vez de simplificarlo a
 * `g.status === "FAIL"`) porque es la dirección conservadora: sigue siendo
 * correcto para cualquier veredicto que no venga de `buildVerdict`, y hay un
 * test que lo fija con un fixture cuyo `overall` es deliberadamente
 * inconsistente con sus compuertas.
 */

import type { GateResult, Verdict } from "./verdict";

type ClaveGate = keyof Verdict["gates"];

/**
 * Unión discriminada y no `reason?: string`. Un campo opcional debilitaría el
 * tipo también para el veredicto completo y nadie se enteraría de que hay un
 * caso redactado que manejar; con la unión, el compilador señala cada punto de
 * consumo.
 */
export type GateResultPublico =
  ({ redactado: false } & GateResult) | ({ redactado: true } & Omit<GateResult, "reason">);

export interface VerdictPublico extends Omit<Verdict, "gates"> {
  /** Pasó por la redacción; qué compuertas se redactaron lo dice cada una. */
  redactado: true;
  gates: Record<ClaveGate, GateResultPublico>;
}

export type VerdictRespuesta = ({ redactado: false } & Verdict) | VerdictPublico;

/** Una compuerta conserva su explicación si el veredicto entero falló y ella
 *  es una de las que falló, o si no se pudo resolver. */
function conservaExplicacion(g: GateResult, overall: Verdict["overall"]): boolean {
  if (g.status === "UNKNOWN") return true;
  return overall === "FAIL" && g.status === "FAIL";
}

/**
 * Construye un objeto nuevo campo por campo. Nunca `{ ...g }` seguido de borrar
 * `reason`, ni `reason: undefined`: las dos formas dejan rastro en el JSON, que
 * es precisamente la fuga que este módulo existe para impedir.
 */
export function redactarVerdict(v: Verdict): VerdictPublico {
  const claves = Object.keys(v.gates) as ClaveGate[];
  const gates = {} as Record<ClaveGate, GateResultPublico>;

  for (const clave of claves) {
    const g = v.gates[clave];
    gates[clave] = conservaExplicacion(g, v.overall)
      ? {
          redactado: false,
          status: g.status,
          reason: g.reason,
          resolvedBy: g.resolvedBy,
          requiredLevel: g.requiredLevel,
        }
      : {
          redactado: true,
          status: g.status,
          resolvedBy: g.resolvedBy,
          requiredLevel: g.requiredLevel,
        };
  }

  return {
    redactado: true,
    procesoId: v.procesoId,
    overall: v.overall,
    level: v.level,
    evaluatedAt: v.evaluatedAt,
    gates,
  };
}

/**
 * Type guard nombrado y no `"redactado" in g && g.redactado` en línea: con esa
 * forma de unión (miembros que son intersecciones), TypeScript no reduce el
 * tipo a partir de una condición compuesta — un chequeo `in` encadenado con
 * una igualdad booleana — así que `g.reason` en el siguiente `return` queda
 * sin resolver: falso `error TS2339` que solo aparece en `tsc`/`next build`,
 * nunca en vitest (no type-checkea). Un predicado con firma `g is X` sí
 * reduce la unión.
 */
function esRedactado(
  g: GateResult | GateResultPublico
): g is { redactado: true } & Omit<GateResult, "reason"> {
  return "redactado" in g && g.redactado === true;
}

/**
 * La explicación de una compuerta, o `null` si fue redactada. Existe para que
 * los consumidores de UI no tengan que conocer la forma de la unión.
 */
export function razonDe(g: GateResult | GateResultPublico): string | null {
  if (esRedactado(g)) return null;
  return g.reason;
}
