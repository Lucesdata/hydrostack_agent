/**
 * Explorador de oportunidades (CI-11c). Lee SOLO lo ya ingerido y reutiliza las
 * reglas existentes: `condicionAbierto()` para las convocatorias y la regla de
 * contrato en ejecución de la vitrina (firmado desde 2026, sin cancelar, con
 * contratista NIT, por fechas). No toca `/licitaciones`.
 *
 * El filtro de tecnología tiene DOS pasos, a propósito:
 *  1. Prefiltro en SQL por los términos de la categoría (sin tildes, límite de
 *     palabra): barato y acota la página.
 *  2. El clasificador puro (CI-01) decide después, fila a fila: aplica negaciones
 *     y contexto («no incluye el suministro de bombas…»). Lo que el clasificador
 *     descarta no se muestra y se CUENTA en `descartadasPorContexto`.
 * Por eso `total` es de coincidencias de texto (antes del paso 2).
 *
 * Privacidad: solo contratistas con NIT; un contrato de persona natural no entra.
 */
import { and, asc, desc, eq, gte, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { contrato, entidad, geografia, proceso, proveedor } from "@/src/lib/db/schema";
import { condicionAbierto } from "@/src/lib/secop/agregados";
import { tiposDeSistema } from "@/src/lib/secop/busqueda-guiada";
import { DESDE_CICLO_DE_VIDA } from "@/src/lib/secop/como-se-contrato";
import { slugDeProceso } from "@/src/lib/secop/slug";
import { clasificarTecnologia } from "@/src/lib/tecnologia/clasificador";
import { NODO_POR_CODIGO } from "@/src/lib/tecnologia/taxonomia-v1";
import { hoyEnColombia } from "./ficha-contrato";
import {
  patronDeTecnologia,
  POR_PAGINA_EXPLORADOR,
  type ParametrosExplorador,
} from "./explorador-params";

export interface TecnologiaDetectada {
  codigo: string;
  nombre: string;
  cita: string;
}

export interface Oportunidad {
  tipo: "convocatoria" | "contrato";
  /** Id nativo de SECOP (proceso o contrato). */
  id: string;
  href: string;
  objeto: string | null;
  entidad: string | null;
  /** Sede de la entidad: la fuente no publica el lugar de ejecución. */
  sede: string | null;
  tipoProyecto: string | null;
  valor: number | null;
  /** Convocatorias: fecha de cierre de ofertas y días que faltan. */
  fechaRecepcion: string | null;
  diasRestantes: number | null;
  /** Contratos: fin previsto y estado administrativo. */
  fechaFin: string | null;
  estado: string | null;
  contratista: string | null;
  tecnologias: TecnologiaDetectada[];
}

export interface ResultadoExplorador {
  /** Coincidencias de texto antes de aplicar negaciones y contexto. */
  total: number;
  filas: Oportunidad[];
  /** Filas de esta página que el prefiltro aceptó y el clasificador descartó. */
  descartadasPorContexto: number;
  porPagina: number;
}

/** Tope por consulta: el pool de la base es de 3 conexiones. */
export const TOPE_CONSULTA_MS = 8000;

/** `db` o la transacción que lo envuelve: lo único que las consultas necesitan. */
type Ejecutor = Pick<typeof db, "select" | "execute">;

const HOY_SQL = sql`(now() at time zone 'America/Bogota')::date`;
const SIN_TILDES = (texto: SQL) => sql`translate(lower(${texto}), 'áéíóúüñ', 'aeiouun')`;

const num = (v: string | null): number | null => {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const dia = (v: string | null): string | null =>
  v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null;
const ubicacion = (m: string | null, d: string | null) => [m, d].filter(Boolean).join(", ") || null;

function diasHasta(hoy: string, fecha: string | null): number | null {
  if (!fecha) return null;
  return Math.round(
    (Date.parse(`${fecha}T12:00:00Z`) - Date.parse(`${hoy}T12:00:00Z`)) / 86_400_000
  );
}

/** ¿El clasificador confirma la categoría pedida (o una hija si es raíz)? */
function confirma(codigo: string, detectadas: TecnologiaDetectada[]): boolean {
  return detectadas.some((t) => t.codigo === codigo || NODO_POR_CODIGO[t.codigo]?.padre === codigo);
}

function detectar(texto: string): TecnologiaDetectada[] {
  return clasificarTecnologia(texto).candidatos.map((c) => ({
    codigo: c.codigo,
    nombre: NODO_POR_CODIGO[c.codigo]?.nombre_es ?? c.codigo,
    cita: c.cita,
  }));
}

export async function buscarOportunidades(
  p: ParametrosExplorador,
  hoy: string = hoyEnColombia()
): Promise<ResultadoExplorador> {
  const offset = (p.pagina - 1) * POR_PAGINA_EXPLORADOR;
  const patron = p.tecnologia ? patronDeTecnologia(p.tecnologia) : null;

  const consultar = (ex: Ejecutor) =>
    p.etapa === "convocatoria"
      ? convocatorias(ex, p, patron, offset, hoy)
      : ejecucion(ex, p, patron, offset);
  // En la base viva (medido el 2026-11-09) recorrer `proceso` tarda ≈3,3 s y los contratos en
  // ejecución ≈6,1 s —no hay índice para esas condiciones—, con o sin filtro de tecnología.
  // Por eso TODA consulta va de una sola pasada (`count(*) over()`) y con tope de tiempo, para
  // no ocupar una de las 3 conexiones del pool ni pasarse del límite de la función.
  const filas = await db.transaction(async (tx) => {
    await tx.execute(sql`set local statement_timeout = ${sql.raw(String(TOPE_CONSULTA_MS))}`);
    return consultar(tx as unknown as Ejecutor);
  });

  let descartadas = 0;
  const finales = filas.filas.filter((f) => {
    if (!p.tecnologia) return true;
    const ok = confirma(p.tecnologia, f.tecnologias);
    if (!ok) descartadas++;
    return ok;
  });
  return {
    total: filas.total,
    filas: finales,
    descartadasPorContexto: descartadas,
    porPagina: POR_PAGINA_EXPLORADOR,
  };
}

async function convocatorias(
  ex: Ejecutor,
  p: ParametrosExplorador,
  patron: string | null,
  offset: number,
  hoy: string
) {
  const texto = sql`concat_ws(' ', ${proceso.objeto}, ${proceso.descripcion})`;
  const where = and(
    condicionAbierto(),
    p.tipo ? inArray(proceso.tipoProyecto, [...tiposDeSistema(p.tipo)]) : undefined,
    p.departamento ? sql`left(${proceso.geografiaId}, 2) = ${p.departamento}` : undefined,
    patron ? sql`${SIN_TILDES(texto)} ~ ${patron}` : undefined
  );

  const contar = async () =>
    (
      await ex
        .select({ total: sql<number>`count(*)::int` })
        .from(proceso)
        .where(where)
    )[0].total;
  // UNA sola pasada: el total sale de `count(*) over()` en vez de un segundo escaneo.
  const rows = await ex
    .select({
      id: proceso.secopProcesoId,
      objeto: proceso.objeto,
      descripcion: proceso.descripcion,
      tipoProyecto: proceso.tipoProyecto,
      valor: sql<string | null>`${proceso.valorEstimado}::text`,
      recepcion: sql<string | null>`${proceso.fechaRecepcion}::text`,
      entidad: entidad.nombre,
      municipio: geografia.municipioNombre,
      departamento: geografia.departamentoNombre,
      total: sql<number>`(count(*) over())::int`,
    })
    .from(proceso)
    .leftJoin(entidad, eq(entidad.id, proceso.entidadId))
    .leftJoin(geografia, eq(geografia.codigoDivipola, proceso.geografiaId))
    .where(where)
    .orderBy(asc(proceso.fechaRecepcion), asc(proceso.secopProcesoId))
    .limit(POR_PAGINA_EXPLORADOR)
    .offset(offset);
  // Una página fuera de rango no trae filas ni total: solo entonces se cuenta aparte.
  const total = rows.length > 0 ? rows[0].total : offset === 0 ? 0 : await contar();

  return {
    total,
    filas: rows.map<Oportunidad>((r) => {
      const recepcion = dia(r.recepcion);
      return {
        tipo: "convocatoria",
        id: r.id,
        href: `/licitaciones/${slugDeProceso(r.objeto, r.id)}`,
        objeto: r.objeto,
        entidad: r.entidad,
        sede: ubicacion(r.municipio, r.departamento),
        tipoProyecto: r.tipoProyecto,
        valor: num(r.valor),
        fechaRecepcion: recepcion,
        diasRestantes: diasHasta(hoy, recepcion),
        fechaFin: null,
        estado: null,
        contratista: null,
        tecnologias: detectar([r.objeto, r.descripcion].filter(Boolean).join(". ")),
      };
    }),
  };
}

async function ejecucion(
  ex: Ejecutor,
  p: ParametrosExplorador,
  patron: string | null,
  offset: number
) {
  const fin = sql`coalesce(${contrato.fechaFinActual}, ${contrato.fechaFinInicial})`;
  const geo = sql`coalesce(${entidad.geografiaId}, ${contrato.geografiaId})`;
  const where = and(
    isNull(contrato.deletedAt),
    gte(contrato.fechaFirma, DESDE_CICLO_DE_VIDA),
    sql`coalesce(${contrato.estadoActual}, '') !~* '^(borrador|enviado proveedor|en aprobaci[oó]n)$'`,
    sql`coalesce(${contrato.estadoActual}, '') !~* '(cancel|desiert|revoc)'`,
    sql`upper(trim(${proveedor.tipoDocumento})) = 'NIT'`,
    sql`${contrato.fechaInicio} <= ${HOY_SQL}`,
    sql`(${fin} is null or ${fin} >= ${HOY_SQL})`,
    p.tipo ? inArray(proceso.tipoProyecto, [...tiposDeSistema(p.tipo)]) : undefined,
    p.departamento ? sql`left(${geo}, 2) = ${p.departamento}` : undefined,
    patron ? sql`${SIN_TILDES(sql`${contrato.objeto}`)} ~ ${patron}` : undefined
  );

  const contar = async () =>
    (
      await ex
        .select({ total: sql<number>`count(*)::int` })
        .from(contrato)
        .innerJoin(proveedor, eq(proveedor.id, contrato.proveedorId))
        .leftJoin(entidad, eq(entidad.id, contrato.entidadId))
        .leftJoin(proceso, eq(proceso.id, contrato.procesoId))
        .where(where)
    )[0].total;

  const rows = await ex
    .select({
      id: contrato.secopContratoId,
      objeto: contrato.objeto,
      tipoProyecto: proceso.tipoProyecto,
      valor: sql<string | null>`${contrato.valorActual}::text`,
      fin: sql<string | null>`${fin}::text`,
      estado: contrato.estadoActual,
      entidad: entidad.nombre,
      contratista: proveedor.razonSocial,
      municipio: geografia.municipioNombre,
      departamento: geografia.departamentoNombre,
      total: sql<number>`(count(*) over())::int`,
    })
    .from(contrato)
    .innerJoin(proveedor, eq(proveedor.id, contrato.proveedorId))
    .leftJoin(entidad, eq(entidad.id, contrato.entidadId))
    .leftJoin(proceso, eq(proceso.id, contrato.procesoId))
    .leftJoin(geografia, eq(geografia.codigoDivipola, geo))
    .where(where)
    .orderBy(desc(contrato.fechaFirma), asc(contrato.secopContratoId))
    .limit(POR_PAGINA_EXPLORADOR)
    .offset(offset);
  const total = rows.length > 0 ? rows[0].total : offset === 0 ? 0 : await contar();

  return {
    total,
    filas: rows.map<Oportunidad>((r) => ({
      tipo: "contrato",
      id: r.id,
      href: `/comercial/contratos/${r.id}`,
      objeto: r.objeto,
      entidad: r.entidad,
      sede: ubicacion(r.municipio, r.departamento),
      tipoProyecto: r.tipoProyecto,
      valor: num(r.valor),
      fechaRecepcion: null,
      diasRestantes: null,
      fechaFin: dia(r.fin),
      estado: r.estado,
      contratista: r.contratista,
      tecnologias: detectar(r.objeto ?? ""),
    })),
  };
}
