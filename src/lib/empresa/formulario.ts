/**
 * Del formulario HTML a la entrada del servicio (CI-11b). Puro: no toca la base
 * ni la sesión. Solo lee los campos que el formulario ofrece (`razonSocial`,
 * `pais`, `rol`, `cap`, `marcas:*`, `dpto`, `attr:*`…); estados de dato,
 * verificación e ids no existen aquí, así que no se pueden fijar por esta vía.
 *
 * El formulario no edita las especificaciones técnicas ni la cobertura
 * municipal: se CONSERVAN las ya guardadas para que re-guardar no las borre
 * (el servicio reemplaza los hijos).
 */
import { CLAVES_ATRIBUTOS } from "./validar";
import type { EmpresaGuardada } from "./servicio";

/** Atributos que son listas (se escriben separados por comas). */
export const ATRIBUTOS_LISTA: readonly string[] = ["idiomas", "monedas", "certificaciones"];

const texto = (fd: FormData, nombre: string): string => {
  const v = fd.get(nombre);
  return typeof v === "string" ? v : "";
};
const lista = (s: string): string[] =>
  s
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
const todos = (fd: FormData, nombre: string): string[] =>
  fd.getAll(nombre).filter((v): v is string => typeof v === "string");

export function entradaDesdeFormData(fd: FormData, existente: EmpresaGuardada | null): unknown {
  const especPrevias = new Map(
    (existente?.capacidades ?? []).map((c) => [c.nodoCodigo, c.especificaciones] as const)
  );

  const atributos: Record<string, string | string[]> = {};
  for (const clave of CLAVES_ATRIBUTOS) {
    const v = texto(fd, `attr:${clave}`).trim();
    if (v === "") continue;
    atributos[clave] = ATRIBUTOS_LISTA.includes(clave) ? lista(v) : v;
  }

  const municipiosPrevios = (existente?.cobertura ?? [])
    .map((c) => c.divipola)
    .filter((d) => d.length === 5);

  return {
    razonSocial: texto(fd, "razonSocial"),
    pais: texto(fd, "pais"),
    registroEmpresarial: texto(fd, "registroEmpresarial"),
    sitioOficial: texto(fd, "sitioOficial"),
    coberturaNacional: texto(fd, "coberturaNacional") === "on",
    roles: todos(fd, "rol"),
    capacidades: todos(fd, "cap").map((nodoCodigo) => ({
      nodoCodigo,
      marcas: lista(texto(fd, `marcas:${nodoCodigo}`)),
      especificaciones: especPrevias.get(nodoCodigo) ?? null,
    })),
    cobertura: [...todos(fd, "dpto"), ...municipiosPrevios],
    atributos,
  };
}
