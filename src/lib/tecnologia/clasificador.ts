/**
 * Clasificador tecnológico — puro, determinista, sin IA y sin base de datos.
 *
 * Dado un texto corto (objeto de contrato, descripción de proceso) devuelve los
 * CANDIDATOS de tecnología que menciona, cada uno con la cita literal que lo
 * respalda. Nunca produce un estado distinto de `inferida`: pasar a
 * `documentada` exige un pliego con cita verificada y pasar a `confirmada`
 * exige a un representante verificado del contratista (spec datos §5). Un
 * modelo de IA tampoco confirma nada: este módulo ni siquiera lo usa (D14).
 *
 * No inventa cantidades, especificaciones, precios ni fechas: no las extrae.
 *
 * Reglas:
 *  · Coincidencia por término completo (no dentro de otra palabra: «bombero»
 *    no activa nada); el plural simple `s` se acepta.
 *  · Negación: un negador antes del término, en la misma cláusula y dentro de
 *    `VENTANA_NEGACION` caracteres, descarta el término («no incluye el
 *    suministro de bombas sumergibles»).
 *  · Un nodo hijo con evidencia desplaza a su padre: se informa lo más
 *    específico.
 *  · La cita es un fragmento literal del texto ORIGINAL (con sus tildes y
 *    mayúsculas), localizable por `inicio`/`fin`.
 */

import {
  NEGADORES,
  NODOS_TECNOLOGIA,
  TAXONOMIA_VERSION,
  VENTANA_NEGACION,
  type NodoTecnologia,
} from "./taxonomia-v1";

export const CLASIFICADOR_TECNOLOGIA_VERSION = "1.1.0-borrador";

export interface CandidatoTecnologia {
  codigo: string;
  /** Término de la taxonomía que coincidió (normalizado). */
  termino: string;
  /** Fragmento literal del texto original. */
  cita: string;
  inicio: number;
  fin: number;
  idioma: "es" | "en";
  /** Siempre `inferida`: este módulo no puede promover el estado. */
  estado: "inferida";
  /** Texto libre corto con coincidencia de taxonomía (spec datos §4). */
  calidadEvidencia: "C";
  versionTaxonomia: string;
  versionClasificador: string;
}

export interface TerminoDescartado {
  codigo: string;
  termino: string;
  cita: string;
  /**
   * `negado`: lo precede un negador. `contexto`: una frase excluyente del nodo
   * lo sigue. `destino`: un servicio nombrado solo como destino de un suministro
   * («suministro de herramientas PARA el mantenimiento de la planta»).
   */
  motivo: "negado" | "contexto" | "destino";
  /** Negador, frase excluyente o «suministro … para», según el motivo. */
  negador: string;
}

export interface ResultadoTecnologia {
  candidatos: CandidatoTecnologia[];
  /** Coincidencias descartadas, conservadas para auditoría y pruebas. */
  descartados: TerminoDescartado[];
}

/**
 * Normaliza carácter a carácter para que los índices del texto normalizado
 * coincidan con los del original: así la cita sale literal.
 */
export function normalizarConIndices(texto: string): string {
  let salida = "";
  for (const ch of texto) {
    const sinTilde = ch.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const minus = sinTilde.toLowerCase();
    // Si la normalización cambia la longitud (raro), se conserva un carácter
    // para no desalinear los índices.
    salida += minus.length === ch.length ? minus : ch.toLowerCase().slice(0, ch.length);
  }
  return salida;
}

const ES_LETRA = /[a-z0-9]/;

function limiteIzquierdo(t: string, i: number): boolean {
  return i === 0 || !ES_LETRA.test(t[i - 1]);
}

/** Acepta el plural simple `s` tras el término. */
function finDeTermino(t: string, fin: number): number | null {
  if (fin >= t.length) return fin;
  if (!ES_LETRA.test(t[fin])) return fin;
  if (t[fin] === "s" && (fin + 1 >= t.length || !ES_LETRA.test(t[fin + 1]))) return fin + 1;
  return null;
}

const SEPARADORES_CLAUSULA = /[.;:,()\n\r]/;

/** Devuelve el negador que niega el término, o null. */
function negadorPrevio(t: string, inicio: number): string | null {
  let desde = Math.max(0, inicio - VENTANA_NEGACION);
  // La cláusula empieza después del último separador antes del término.
  for (let k = inicio - 1; k >= desde; k--) {
    if (SEPARADORES_CLAUSULA.test(t[k])) {
      desde = k + 1;
      break;
    }
  }
  const ventana = t.slice(desde, inicio);
  for (const neg of NEGADORES) {
    let pos = ventana.indexOf(neg);
    while (pos !== -1) {
      const antes = pos === 0 || !ES_LETRA.test(ventana[pos - 1]);
      const despuesIdx = pos + neg.length;
      const despues = despuesIdx >= ventana.length || !ES_LETRA.test(ventana[despuesIdx]);
      if (antes && despues) return neg;
      pos = ventana.indexOf(neg, pos + 1);
    }
  }
  return null;
}

/** Texto de la cláusula que contiene `pos`, hasta los separadores. */
function clausulaDe(t: string, pos: number): { ini: number; fin: number } {
  let ini = pos;
  while (ini > 0 && !SEPARADORES_CLAUSULA.test(t[ini - 1])) ini--;
  let fin = pos;
  while (fin < t.length && !SEPARADORES_CLAUSULA.test(t[fin])) fin++;
  return { ini, fin };
}

/** Frase excluyente del nodo dentro de los 40 caracteres siguientes, misma cláusula. */
function contextoExcluyente(t: string, fin: number, nodo: NodoTecnologia): string | null {
  if (!nodo.contextoExcluyente?.length) return null;
  const { fin: finClausula } = clausulaDe(t, fin);
  const cola = t.slice(fin, Math.min(finClausula, fin + 40));
  for (const frase of nodo.contextoExcluyente) {
    const i = cola.indexOf(frase);
    if (i === -1) continue;
    const antes = i === 0 || !ES_LETRA.test(cola[i - 1]);
    const despIdx = i + frase.length;
    const despues = despIdx >= cola.length || !ES_LETRA.test(cola[despIdx]);
    if (antes && despues) return frase;
  }
  return null;
}

const SUMINISTRO_PARA = /\bsuministro\b[^.;:,()]*\bpara\b[^.;:,()]*$/;

/**
 * Un servicio que solo es el destino de un suministro no es lo contratado:
 * «suministro de herramientas manuales para el mantenimiento de la planta».
 */
function esDestinoDeSuministro(t: string, inicio: number, nodo: NodoTecnologia): boolean {
  if (nodo.naturaleza !== "servicio") return false;
  const { ini } = clausulaDe(t, inicio);
  return SUMINISTRO_PARA.test(t.slice(ini, inicio));
}

interface Terminos {
  nodo: NodoTecnologia;
  termino: string;
  idioma: "es" | "en";
}

const TERMINOS: readonly Terminos[] = NODOS_TECNOLOGIA.flatMap((nodo) => [
  ...nodo.es.map((termino) => ({ nodo, termino, idioma: "es" as const })),
  ...nodo.en.map((termino) => ({ nodo, termino, idioma: "en" as const })),
])
  // Los más largos primero: «bomba sumergible» gana a términos más cortos.
  .sort((a, b) => b.termino.length - a.termino.length || a.termino.localeCompare(b.termino));

export function clasificarTecnologia(texto: string | null | undefined): ResultadoTecnologia {
  const vacio: ResultadoTecnologia = { candidatos: [], descartados: [] };
  if (!texto || !texto.trim()) return vacio;

  const t = normalizarConIndices(texto);
  const porNodo = new Map<string, CandidatoTecnologia>();
  const descartados: TerminoDescartado[] = [];

  for (const { nodo, termino, idioma } of TERMINOS) {
    if (porNodo.has(nodo.codigo)) continue;
    let desde = 0;
    while (desde <= t.length - termino.length) {
      const inicio = t.indexOf(termino, desde);
      if (inicio === -1) break;
      desde = inicio + 1;
      if (!limiteIzquierdo(t, inicio)) continue;
      const fin = finDeTermino(t, inicio + termino.length);
      if (fin === null) continue;

      const negador = negadorPrevio(t, inicio);
      if (negador) {
        descartados.push({
          codigo: nodo.codigo,
          termino,
          cita: texto.slice(inicio, fin),
          motivo: "negado",
          negador,
        });
        continue;
      }
      const frase = contextoExcluyente(t, fin, nodo);
      if (frase) {
        descartados.push({
          codigo: nodo.codigo,
          termino,
          cita: texto.slice(inicio, fin),
          motivo: "contexto",
          negador: frase,
        });
        continue;
      }
      if (esDestinoDeSuministro(t, inicio, nodo)) {
        descartados.push({
          codigo: nodo.codigo,
          termino,
          cita: texto.slice(inicio, fin),
          motivo: "destino",
          negador: "suministro … para",
        });
        continue;
      }
      porNodo.set(nodo.codigo, {
        codigo: nodo.codigo,
        termino,
        cita: texto.slice(inicio, fin),
        inicio,
        fin,
        idioma,
        estado: "inferida",
        calidadEvidencia: "C",
        versionTaxonomia: TAXONOMIA_VERSION,
        versionClasificador: CLASIFICADOR_TECNOLOGIA_VERSION,
      });
      break;
    }
  }

  // Un hijo con evidencia desplaza a su padre.
  const padresDesplazados = new Set<string>();
  for (const codigo of porNodo.keys()) {
    const padre = NODOS_TECNOLOGIA.find((n) => n.codigo === codigo)?.padre;
    if (padre) padresDesplazados.add(padre);
  }
  const candidatos = [...porNodo.values()]
    .filter((c) => !padresDesplazados.has(c.codigo))
    .sort((a, b) => a.inicio - b.inicio || a.codigo.localeCompare(b.codigo));

  descartados.sort(
    (a, b) => a.codigo.localeCompare(b.codigo) || a.termino.localeCompare(b.termino)
  );
  return { candidatos, descartados };
}
