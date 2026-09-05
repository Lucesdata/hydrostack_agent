/**
 * Contrato del filtro de usuario (SDD §4.2) y su validación.
 *
 * Módulo puro: sin IO, sin base, testeable con literales. La semántica que fija
 * el SDD y que ninguna capa puede reinterpretar es ésta:
 *
 *   **un array NULL o vacío significa "sin restricción", nunca "no coincide con
 *   nada"**.
 *
 * Es la diferencia entre un filtro recién creado que devuelve todo el sector y
 * uno que devuelve silencio. El silencio es el modo de fallo caro de este
 * producto (SDD §6.2) y empieza aquí.
 */

/** Transiciones notificables — las demás son ruido (SDD, decisiones técnicas). */
export const EVENTOS_NOTIFICABLES = ["apertura", "adenda", "adjudicacion"] as const;
export type EventoNotificable = (typeof EVENTOS_NOTIFICABLES)[number];

export interface FiltroEntrada {
  nombre: string;
  activo?: boolean;
  unspsc?: string[];
  palabrasClave?: string[];
  palabrasExcluidas?: string[];
  entidadesNit?: string[];
  divipola?: string[];
  modalidades?: string[];
  valorMin?: number | null;
  valorMax?: number | null;
  eventosNotificables?: EventoNotificable[];
}

export interface FiltroUsuario extends Required<Omit<FiltroEntrada, "valorMin" | "valorMax">> {
  id: string;
  accountId: string;
  valorMin: string | null;
  valorMax: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FiltroValidado
  extends Required<Omit<FiltroEntrada, "valorMin" | "valorMax">> {
  valorMin: string | null;
  valorMax: string | null;
}

/**
 * El repo compila con `strict: false`, así que una unión discriminada por
 * `ok: true | false` no estrecha y obligaría a asertar el tipo en cada handler.
 * Se usa el idiom que ya emplea el resto del código (`getSessionUser`,
 * `preferencias-store`): `error` no nulo significa rechazo, y entonces `valor`
 * es null.
 */
export interface ResultadoValidacion {
  error: string | null;
  valor: FiltroValidado | null;
}

const rechazo = (error: string): ResultadoValidacion => ({ error, valor: null });

/** Solo dígitos: el NIT canónico del repo va sin DV y sin formato (D5). */
const SOLO_DIGITOS = /^\d+$/;
/** DIVIPOLA: 2 dígitos (departamento completo) o 5 (municipio). */
const DIVIPOLA = /^(\d{2}|\d{5})$/;
/**
 * UNSPSC sin el prefijo "V1.". Se admite un código a CUALQUIER nivel de la
 * jerarquía (segmento 2, familia 4, clase 6, producto 8), porque `evaluarFiltro`
 * hace match por prefijo y la propia red del repo usa "83101"
 * (`WATER_EXCLUSIVE_UNSPSC` en `secop/ingest-net.ts`). Exigir 6+ dígitos
 * rechazaba justo los códigos que el resto del sistema usa.
 */
const UNSPSC = /^\d{2,10}$/;

const MAX_ITEMS = 100;
const MAX_LARGO = 120;

function normalizarLista(
  v: unknown,
  campo: string,
  transformar: (s: string) => string,
  validar?: (s: string) => boolean
): string[] | { error: string } {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) return { error: `${campo} debe ser una lista` };
  if (v.length > MAX_ITEMS) return { error: `${campo} admite como máximo ${MAX_ITEMS} elementos` };

  const salida: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") return { error: `${campo} solo admite texto` };
    const s = transformar(item.trim());
    if (s === "") continue; // un vacío no es un criterio; se descarta en silencio
    if (s.length > MAX_LARGO) return { error: `${campo}: "${s.slice(0, 20)}…" es demasiado largo` };
    if (validar && !validar(s)) return { error: `${campo}: "${s}" no tiene el formato esperado` };
    if (!salida.includes(s)) salida.push(s);
  }
  return salida;
}

/**
 * Las keywords se guardan en MAYÚSCULAS y **con las tildes que traigan**, pero
 * el motor las compara accent-insensitive. La red de ingesta
 * (`secop/ingest-net.ts`) resuelve el mismo problema al revés, exigiendo
 * términos sin tilde porque el `upper()` de SoQL no las quita. Aquí no hace
 * falta esa disciplina: la comparación ocurre en Postgres, donde `unaccent` sí
 * existe. Se documenta para que nadie copie la regla de allí sin pensar.
 */
const aMayusculas = (s: string) => s.toUpperCase();

function validarCuantia(v: unknown, campo: string): string | null | { error: string } {
  if (v === undefined || v === null) return null;
  if (typeof v !== "number" || !Number.isFinite(v)) return { error: `${campo} debe ser un número` };
  if (v < 0) return { error: `${campo} no puede ser negativo` };
  // numeric(20,2): el entero admite hasta 18 dígitos.
  if (v > 1e17) return { error: `${campo} excede el máximo representable` };
  return v.toFixed(2);
}

export function validarFiltro(body: unknown): ResultadoValidacion {
  if (!body || typeof body !== "object") return rechazo("Cuerpo inválido");
  const o = body as Record<string, unknown>;

  if (typeof o.nombre !== "string" || o.nombre.trim() === "") {
    return rechazo("El filtro necesita un nombre");
  }
  const nombre = o.nombre.trim();
  if (nombre.length > MAX_LARGO) return rechazo("El nombre es demasiado largo");

  if (o.activo !== undefined && typeof o.activo !== "boolean") {
    return rechazo("activo debe ser booleano");
  }

  const listas: Array<[keyof FiltroEntrada, (s: string) => string, ((s: string) => boolean) | undefined]> = [
    ["unspsc", (s) => s, (s) => UNSPSC.test(s)],
    ["palabrasClave", aMayusculas, undefined],
    ["palabrasExcluidas", aMayusculas, undefined],
    ["entidadesNit", (s) => s.replace(/\D/g, ""), (s) => SOLO_DIGITOS.test(s)],
    ["divipola", (s) => s, (s) => DIVIPOLA.test(s)],
    ["modalidades", (s) => s, undefined],
  ];

  const out: Record<string, unknown> = { nombre, activo: o.activo ?? true };
  for (const [campo, transformar, validar] of listas) {
    const r = normalizarLista(o[campo], String(campo), transformar, validar);
    if (!Array.isArray(r)) return rechazo(r.error);
    out[campo] = r;
  }

  const min = validarCuantia(o.valorMin, "valorMin");
  if (min !== null && typeof min === "object") return rechazo(min.error);
  const max = validarCuantia(o.valorMax, "valorMax");
  if (max !== null && typeof max === "object") return rechazo(max.error);
  if (min !== null && max !== null && Number(min) > Number(max)) {
    return rechazo("valorMin no puede ser mayor que valorMax");
  }
  out.valorMin = min;
  out.valorMax = max;

  if (o.eventosNotificables === undefined || o.eventosNotificables === null) {
    out.eventosNotificables = [...EVENTOS_NOTIFICABLES];
  } else {
    if (!Array.isArray(o.eventosNotificables)) {
      return rechazo("eventosNotificables debe ser una lista");
    }
    const ev = o.eventosNotificables.filter(
      (e): e is EventoNotificable =>
        typeof e === "string" && (EVENTOS_NOTIFICABLES as readonly string[]).includes(e)
    );
    if (ev.length !== o.eventosNotificables.length) {
      return rechazo(`eventosNotificables solo admite: ${EVENTOS_NOTIFICABLES.join(", ")}`);
    }
    // Una lista vacía aquí sí es una decisión real ("no me avises de nada"), a
    // diferencia de los arrays de criterio. No se rellena con el default.
    out.eventosNotificables = [...new Set(ev)];
  }

  return { error: null, valor: out as unknown as FiltroValidado };
}
