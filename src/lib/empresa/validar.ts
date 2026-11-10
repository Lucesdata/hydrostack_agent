/**
 * Validación pura del perfil de empresa comercial (CI-05). Sin base de datos ni
 * sesión: recibe lo que manda el cliente (no confiable) y devuelve el valor
 * normalizado o la lista de errores. Spec: …/specs/2026-11-09-commercial-
 * intelligence-prd.md §7 y docs/sdd/00-esqueleto.md §4.9.
 *
 * Principios:
 *  · Solo se leen los campos CONOCIDOS. Nada de `usuarioId`, `empresaId`,
 *    `estadoVerificacion` ni estados de dato viene del cliente: todo lo que el
 *    usuario escribe nace `declarado`; `documentado` y `verificado` los fija la
 *    verificación, no el formulario.
 *  · Sin listas de precios (brief §6): se rechazan claves de precio en
 *    `especificaciones`, a cualquier profundidad.
 *  · Los nodos de capacidad deben existir en la taxonomía versionada (D16).
 */
import { NODO_POR_CODIGO } from "@/src/lib/tecnologia/taxonomia-v1";

export const ROLES_EMPRESA = [
  "fabricante_internacional",
  "fabricante_colombiano",
  "distribuidor_autorizado",
  "representante_comercial",
  "importador",
  "integrador_tecnologico",
  "empresa_ingenieria",
  "empresa_constructora",
  "prestador_servicios_especializados",
  "consultora",
  "instalacion_mantenimiento",
  "operador_infraestructura",
] as const;
export type RolEmpresa = (typeof ROLES_EMPRESA)[number];

/** Claves de `atributos` permitidas (brief §6). Todo lo demás se rechaza. */
export const CLAVES_ATRIBUTOS = [
  "idiomas",
  "monedas",
  "certificaciones",
  "garantias",
  "soporte_tecnico",
  "repuestos",
  "tiempos_suministro",
  "capacidad_instalacion",
  "operacion",
  "condiciones_importacion_entrega",
] as const;

export interface CapacidadValidada {
  nodoCodigo: string;
  marcas: string[];
  especificaciones: Record<string, unknown> | null;
}

export interface EmpresaValidada {
  razonSocial: string;
  pais: string;
  registroEmpresarial: string | null;
  sitioOficial: string | null;
  coberturaNacional: boolean;
  roles: RolEmpresa[];
  capacidades: CapacidadValidada[];
  cobertura: string[];
  atributos: Record<string, string[]>;
}

export interface ErrorValidacion {
  campo: string;
  codigo:
    | "invalido"
    | "requerido"
    | "demasiado_largo"
    | "demasiado_grande"
    | "nodo_desconocido"
    | "precio_no_permitido"
    | "clave_desconocida";
}

/**
 * El repo compila con `strict: false`, donde un discriminante booleano no
 * estrecha la unión: por eso `valor` y `errores` están en el tipo de los dos
 * casos (`undefined` en el que no aplica) y se comprueba `ok`.
 */
export type ResultadoValidacion =
  | { ok: true; valor: EmpresaValidada; errores?: undefined }
  | { ok: false; errores: ErrorValidacion[]; valor?: undefined };

const MAX_RAZON = 200;
const MAX_REGISTRO = 80;
const MAX_SITIO = 300;
const MAX_CAPACIDADES = 60;
const MAX_MARCAS = 20;
const MAX_MARCA = 80;
const MAX_COBERTURA = 200;
const MAX_ESPEC_BYTES = 4096;
const MAX_PROFUNDIDAD = 4;
const MAX_ATRIBUTO = 500;
const MAX_ATRIBUTO_ITEMS = 20;

/** Fichas de precio: si una clave contiene uno de estos términos, no es un dato técnico. */
const TOKENS_PRECIO_PREFIJO = [
  "precio",
  "price",
  "tarifa",
  "cotiz",
  "quote",
  "costo",
  "descuento",
  "discount",
];
const TOKENS_PRECIO_EXACTOS = new Set([
  "usd",
  "eur",
  "cop",
  "cost",
  "pvp",
  "msrp",
  "valor",
  "arancel",
]);

function claveDePrecio(clave: string): boolean {
  const tokens = clave
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  return tokens.some(
    (t) => TOKENS_PRECIO_EXACTOS.has(t) || TOKENS_PRECIO_PREFIJO.some((p) => t.startsWith(p))
  );
}

function hayPrecio(valor: unknown, profundidad = 0): boolean {
  if (profundidad > MAX_PROFUNDIDAD || valor === null || typeof valor !== "object") return false;
  if (Array.isArray(valor)) return valor.some((v) => hayPrecio(v, profundidad + 1));
  return Object.entries(valor as Record<string, unknown>).some(
    ([k, v]) => claveDePrecio(k) || hayPrecio(v, profundidad + 1)
  );
}

function esObjetoPlano(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function textoOpcional(
  v: unknown,
  campo: string,
  max: number,
  errores: ErrorValidacion[]
): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") {
    errores.push({ campo, codigo: "invalido" });
    return null;
  }
  const t = v.trim();
  if (t === "") return null;
  if (t.length > max) {
    errores.push({ campo, codigo: "demasiado_largo" });
    return null;
  }
  return t;
}

const unicos = <T>(xs: readonly T[]): T[] => [...new Set(xs)];

export function validarEntradaEmpresa(entrada: unknown): ResultadoValidacion {
  const errores: ErrorValidacion[] = [];
  if (!esObjetoPlano(entrada)) {
    return { ok: false, errores: [{ campo: "entrada", codigo: "invalido" }] };
  }

  // Razón social y país.
  const razon = typeof entrada.razonSocial === "string" ? entrada.razonSocial.trim() : "";
  if (razon === "") errores.push({ campo: "razonSocial", codigo: "requerido" });
  else if (razon.length > MAX_RAZON)
    errores.push({ campo: "razonSocial", codigo: "demasiado_largo" });

  const pais = typeof entrada.pais === "string" ? entrada.pais.trim().toUpperCase() : "";
  if (!/^[A-Z]{2}$/.test(pais)) errores.push({ campo: "pais", codigo: "invalido" });

  const registro = textoOpcional(
    entrada.registroEmpresarial,
    "registroEmpresarial",
    MAX_REGISTRO,
    errores
  );

  let sitio = textoOpcional(entrada.sitioOficial, "sitioOficial", MAX_SITIO, errores);
  if (sitio !== null) {
    try {
      const u = new URL(sitio);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("protocolo");
    } catch {
      errores.push({ campo: "sitioOficial", codigo: "invalido" });
      sitio = null;
    }
  }

  // Roles.
  let roles: RolEmpresa[] = [];
  if (entrada.roles !== undefined) {
    if (
      !Array.isArray(entrada.roles) ||
      entrada.roles.some((r) => !ROLES_EMPRESA.includes(r as RolEmpresa))
    ) {
      errores.push({ campo: "roles", codigo: "invalido" });
    } else {
      roles = unicos(entrada.roles as RolEmpresa[]);
    }
  }

  // Capacidades.
  const capacidades: CapacidadValidada[] = [];
  if (entrada.capacidades !== undefined) {
    if (!Array.isArray(entrada.capacidades) || entrada.capacidades.length > MAX_CAPACIDADES) {
      errores.push({ campo: "capacidades", codigo: "invalido" });
    } else {
      const vistos = new Set<string>();
      for (const c of entrada.capacidades) {
        if (!esObjetoPlano(c) || typeof c.nodoCodigo !== "string") {
          errores.push({ campo: "capacidades", codigo: "invalido" });
          continue;
        }
        if (!NODO_POR_CODIGO[c.nodoCodigo]) {
          errores.push({ campo: "capacidades", codigo: "nodo_desconocido" });
          continue;
        }
        if (vistos.has(c.nodoCodigo)) continue;
        vistos.add(c.nodoCodigo);

        const marcasEntrada = c.marcas === undefined ? [] : c.marcas;
        if (
          !Array.isArray(marcasEntrada) ||
          marcasEntrada.length > MAX_MARCAS ||
          marcasEntrada.some(
            (m) => typeof m !== "string" || m.trim() === "" || m.length > MAX_MARCA
          )
        ) {
          errores.push({ campo: "capacidades", codigo: "invalido" });
          continue;
        }
        let espec: Record<string, unknown> | null = null;
        if (c.especificaciones !== undefined && c.especificaciones !== null) {
          if (!esObjetoPlano(c.especificaciones)) {
            errores.push({ campo: "capacidades", codigo: "invalido" });
            continue;
          }
          if (hayPrecio(c.especificaciones)) {
            errores.push({ campo: "capacidades", codigo: "precio_no_permitido" });
            continue;
          }
          if (JSON.stringify(c.especificaciones).length > MAX_ESPEC_BYTES) {
            errores.push({ campo: "capacidades", codigo: "demasiado_grande" });
            continue;
          }
          espec = c.especificaciones;
        }
        capacidades.push({
          nodoCodigo: c.nodoCodigo,
          marcas: unicos((marcasEntrada as string[]).map((m) => m.trim())),
          especificaciones: espec,
        });
      }
    }
  }

  // Cobertura.
  let cobertura: string[] = [];
  if (entrada.cobertura !== undefined) {
    if (
      !Array.isArray(entrada.cobertura) ||
      entrada.cobertura.length > MAX_COBERTURA ||
      entrada.cobertura.some((d) => typeof d !== "string" || !/^[0-9]{2}([0-9]{3})?$/.test(d))
    ) {
      errores.push({ campo: "cobertura", codigo: "invalido" });
    } else {
      cobertura = unicos(entrada.cobertura as string[]);
    }
  }

  // Atributos (idiomas, monedas, garantías…): solo claves conocidas.
  const atributos: Record<string, string[]> = {};
  if (entrada.atributos !== undefined && entrada.atributos !== null) {
    if (!esObjetoPlano(entrada.atributos)) {
      errores.push({ campo: "atributos", codigo: "invalido" });
    } else {
      for (const [clave, valor] of Object.entries(entrada.atributos)) {
        if (!(CLAVES_ATRIBUTOS as readonly string[]).includes(clave)) {
          errores.push({ campo: "atributos", codigo: "clave_desconocida" });
          continue;
        }
        const lista = Array.isArray(valor) ? valor : [valor];
        if (lista.length > MAX_ATRIBUTO_ITEMS || lista.some((v) => typeof v !== "string")) {
          errores.push({ campo: "atributos", codigo: "invalido" });
          continue;
        }
        const limpios = (lista as string[]).map((v) => v.trim()).filter(Boolean);
        if (limpios.some((v) => v.length > MAX_ATRIBUTO)) {
          errores.push({ campo: "atributos", codigo: "demasiado_largo" });
          continue;
        }
        atributos[clave] = limpios;
      }
    }
  }

  if (entrada.coberturaNacional !== undefined && typeof entrada.coberturaNacional !== "boolean") {
    errores.push({ campo: "coberturaNacional", codigo: "invalido" });
  }

  if (errores.length > 0) return { ok: false, errores };
  return {
    ok: true,
    valor: {
      razonSocial: razon,
      pais,
      registroEmpresarial: registro,
      sitioOficial: sitio,
      coberturaNacional: entrada.coberturaNacional === true,
      roles,
      capacidades,
      cobertura,
      atributos,
    },
  };
}

export interface Completitud {
  completo: boolean;
  faltan: ("roles" | "capacidades" | "cobertura")[];
  /** 0–100, cinco partes iguales: razón social, país, roles, capacidades, cobertura. */
  porcentaje: number;
}

/** Qué le falta al perfil para servir al matching. No es un juicio de calidad. */
export function completitud(e: {
  roles: readonly unknown[];
  capacidades: readonly unknown[];
  cobertura: readonly unknown[];
  coberturaNacional: boolean;
}): Completitud {
  const faltan: Completitud["faltan"] = [];
  if (e.roles.length === 0) faltan.push("roles");
  if (e.capacidades.length === 0) faltan.push("capacidades");
  if (e.cobertura.length === 0 && !e.coberturaNacional) faltan.push("cobertura");
  return {
    completo: faltan.length === 0,
    faltan,
    porcentaje: Math.round(((5 - faltan.length) / 5) * 100),
  };
}
