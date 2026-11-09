/**
 * Parámetros del explorador de oportunidades (CI-11c). PURO. Todo lo que llega
 * de la URL se valida contra listas cerradas: lo inválido se descarta, nunca se
 * pasa a la consulta.
 */
import { DEPARTAMENTOS } from "@/data/dane/divipola";
import { esSistema, type SistemaBusqueda } from "@/src/lib/secop/busqueda-guiada";
import { NODO_POR_CODIGO, NODOS_TECNOLOGIA } from "@/src/lib/tecnologia/taxonomia-v1";

export const POR_PAGINA_EXPLORADOR = 20;
export const MAX_PAGINA = 1000;

export const ETAPAS_EXPLORADOR = ["convocatoria", "ejecucion"] as const;
export type EtapaExplorador = (typeof ETAPAS_EXPLORADOR)[number];

export interface ParametrosExplorador {
  etapa: EtapaExplorador;
  /** Código de la taxonomía tecnológica. */
  tecnologia: string | null;
  tipo: SistemaBusqueda | null;
  /** DIVIPOLA de departamento (2 dígitos). */
  departamento: string | null;
  pagina: number;
}

type Params = Record<string, string | string[] | undefined>;

const primero = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

const CODIGOS_DEPARTAMENTO = new Set(DEPARTAMENTOS.map((d) => d.departamentoCodigo));

export function parametrosDesdeUrl(sp: Params): ParametrosExplorador {
  const etapa = primero(sp.etapa);
  const tecnologia = primero(sp.tecnologia);
  const tipo = primero(sp.tipo);
  const dep = primero(sp.departamento);
  const pag = primero(sp.pagina);
  const pagina = /^\d{1,9}$/.test(pag) ? Math.min(MAX_PAGINA, Math.max(1, Number(pag))) : 1;
  return {
    etapa: (ETAPAS_EXPLORADOR as readonly string[]).includes(etapa)
      ? (etapa as EtapaExplorador)
      : "convocatoria",
    tecnologia: NODO_POR_CODIGO[tecnologia] ? tecnologia : null,
    tipo: tipo && esSistema(tipo) ? tipo : null,
    departamento: CODIGOS_DEPARTAMENTO.has(dep) ? dep : null,
    pagina,
  };
}

/** Enlace del explorador con estos filtros; omite lo que es valor por defecto. */
export function hrefExplorador(p: ParametrosExplorador, pagina = p.pagina): string {
  const q = new URLSearchParams();
  if (p.etapa !== "convocatoria") q.set("etapa", p.etapa);
  if (p.tecnologia) q.set("tecnologia", p.tecnologia);
  if (p.tipo) q.set("tipo", p.tipo);
  if (p.departamento) q.set("departamento", p.departamento);
  if (pagina > 1) q.set("pagina", String(pagina));
  const s = q.toString();
  return `/comercial/explorar${s ? `?${s}` : ""}`;
}

const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Patrón PostgreSQL (consumido sobre texto sin tildes y en minúsculas) con los
 * términos de la categoría y, si es raíz, los de sus hijas. Límite de palabra a
 * los dos lados y plural simple. Es un PREFILTRO: el clasificador decide después
 * (negaciones y contexto). `null` si el código no existe.
 */
export function patronDeTecnologia(codigo: string): string | null {
  const nodo = NODO_POR_CODIGO[codigo];
  if (!nodo) return null;
  const nodos = [nodo, ...NODOS_TECNOLOGIA.filter((n) => n.padre === codigo)];
  const terminos = [...new Set(nodos.flatMap((n) => [...n.es, ...n.en]))].sort(
    (a, b) => b.length - a.length
  );
  return `(^|[^a-z0-9])(${terminos.map(escapar).join("|")})s?([^a-z0-9]|$)`;
}
