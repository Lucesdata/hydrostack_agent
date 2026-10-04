/**
 * Persistencia de los filtros de usuario (SDD §4.2).
 *
 * **Toda consulta se filtra por `account_id`, nunca por `usuario_id`** (SDD, R8).
 * `usuario_id` se guarda como autoría —quién creó el filtro— y como FK de
 * borrado en cascada, pero el aislamiento multi-tenant es `account_id`. Hoy los
 * dos valen lo mismo y por eso es fácil equivocarse; en fase 2 dejarán de
 * valerlo y una consulta que filtre por `usuario_id` mostrará solo los filtros
 * propios en vez de los del equipo, en silencio.
 */

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { alFiltrosUsuario } from "@/src/lib/db/schema/aqualicita";
import type { FiltroUsuario } from "./tipos";

type FiltroValidado = Parameters<typeof crearFiltro>[2];

const COLUMNAS = {
  id: alFiltrosUsuario.id,
  accountId: alFiltrosUsuario.accountId,
  nombre: alFiltrosUsuario.nombre,
  activo: alFiltrosUsuario.activo,
  unspsc: alFiltrosUsuario.unspsc,
  palabrasClave: alFiltrosUsuario.palabrasClave,
  palabrasExcluidas: alFiltrosUsuario.palabrasExcluidas,
  entidadesNit: alFiltrosUsuario.entidadesNit,
  divipola: alFiltrosUsuario.divipola,
  modalidades: alFiltrosUsuario.modalidades,
  valorMin: alFiltrosUsuario.valorMin,
  valorMax: alFiltrosUsuario.valorMax,
  eventosNotificables: alFiltrosUsuario.eventosNotificables,
  createdAt: alFiltrosUsuario.createdAt,
  updatedAt: alFiltrosUsuario.updatedAt,
};

/** Las columnas `text[]` llegan como `string[] | null`; el contrato dice lista. */
function normalizar(row: Record<string, unknown>): FiltroUsuario {
  const listas = [
    "unspsc",
    "palabrasClave",
    "palabrasExcluidas",
    "entidadesNit",
    "divipola",
    "modalidades",
    "eventosNotificables",
  ] as const;
  const out = { ...row };
  for (const k of listas) out[k] = (row[k] as string[] | null) ?? [];
  return out as unknown as FiltroUsuario;
}

export async function listarFiltros(accountId: string): Promise<FiltroUsuario[]> {
  const rows = await db
    .select(COLUMNAS)
    .from(alFiltrosUsuario)
    .where(eq(alFiltrosUsuario.accountId, accountId))
    .orderBy(desc(alFiltrosUsuario.createdAt));
  return rows.map(normalizar);
}

export async function crearFiltro(
  accountId: string,
  usuarioId: string,
  datos: {
    nombre: string;
    activo: boolean;
    unspsc: string[];
    palabrasClave: string[];
    palabrasExcluidas: string[];
    entidadesNit: string[];
    divipola: string[];
    modalidades: string[];
    valorMin: string | null;
    valorMax: string | null;
    eventosNotificables: string[];
  }
): Promise<FiltroUsuario> {
  const [row] = await db
    .insert(alFiltrosUsuario)
    .values({ accountId, usuarioId, ...datos })
    .returning(COLUMNAS);
  return normalizar(row);
}

/**
 * Devuelve `null` cuando el filtro no existe **o no es de esta cuenta**. Los dos
 * casos se responden igual (404) a propósito: distinguirlos filtraría la
 * existencia de filtros ajenos.
 */
export async function actualizarFiltro(
  accountId: string,
  id: string,
  datos: FiltroValidado
): Promise<FiltroUsuario | null> {
  const [row] = await db
    .update(alFiltrosUsuario)
    .set({ ...datos, updatedAt: new Date() })
    .where(and(eq(alFiltrosUsuario.id, id), eq(alFiltrosUsuario.accountId, accountId)))
    .returning(COLUMNAS);
  return row ? normalizar(row) : null;
}

export async function borrarFiltro(accountId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(alFiltrosUsuario)
    .where(and(eq(alFiltrosUsuario.id, id), eq(alFiltrosUsuario.accountId, accountId)))
    .returning({ id: alFiltrosUsuario.id });
  return rows.length > 0;
}
