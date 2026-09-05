/**
 * Consulta del historial sancionatorio (SDD §8.1, módulo 3).
 *
 * Local y determinista: los datos ya están en la base, así que responde en
 * milisegundos y sin llamada externa. **No hay consulta bajo demanda**: la
 * V-F-2 descartó SIRI (solo cédulas) y RUES devuelve 403 sin credenciales, así
 * que `al_sanciones_cache` sigue sin productor. Cuando aparezca una fuente
 * consultable, es aquí donde se enchufa.
 *
 * Dos vías, y se devuelven separadas a propósito:
 *
 *  - `directas`: la sanción nombra el documento del proveedor. Evidencia fuerte.
 *  - `porProceso`: la sanción cuelga de un proceso que este proveedor ganó. Es
 *    inferencia — muy probable, no certeza: el sancionado podría ser otro
 *    interviniente del mismo proceso. Mezclarlas presentaría una inferencia
 *    como un hecho.
 */

import { sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";

/** `db.execute` exige una firma de índice; la interfaz la lleva por eso. */
export interface Sancion {
  [k: string]: unknown;
  fuente: string;
  tipo: string | null;
  valorSancion: string | null;
  fechaFirmeza: string | null;
  entidadNombre: string | null;
  numeroActo: string | null;
  proveedorNombre: string | null;
  urlProceso: string | null;
  secopProcesoId?: string | null;
}

export interface HistorialSancionatorio {
  /** La sanción nombra el documento del proveedor. */
  directas: Sancion[];
  /** La sanción cuelga de un proceso que este proveedor ganó. Inferencia. */
  porProceso: Sancion[];
  tieneHallazgo: boolean;
  /**
   * Qué se pudo mirar de verdad. Un `false` en `cruzablePorDocumento` significa
   * "no lo sabemos", no "está limpio": sin NIT creíble la vía directa no aplica.
   */
  cobertura: {
    cruzablePorDocumento: boolean;
    fuentesConsultadas: string[];
    fuentesNoDisponibles: string[];
  };
}

/** Fuentes que la V-F-2 dejó fuera. Se declaran para no aparentar cobertura total. */
const NO_DISPONIBLES = [
  "SIRI (Procuraduría) — solo publica cédulas, no cruza con NIT de empresa",
  "RUES — la API responde 403 sin credenciales",
  "Boletín de Responsables Fiscales — no publicado como dataset nacional",
];

export async function sancionesDeProveedor(
  nitOrKey: string
): Promise<HistorialSancionatorio> {
  const nit = /^\d{6,12}$/.test(nitOrKey) ? nitOrKey : null;
  const key = /^\d+$/.test(nitOrKey) ? `nit:${nitOrKey}` : nitOrKey;

  const directas = nit
    ? await db.execute<Sancion>(sql`
        SELECT fuente, tipo, valor_sancion AS "valorSancion",
               fecha_firmeza::text AS "fechaFirmeza",
               entidad_nombre AS "entidadNombre", numero_acto AS "numeroActo",
               proveedor_nombre AS "proveedorNombre", url_proceso AS "urlProceso"
        FROM al_sanciones
        WHERE nit_canonico = ${nit}
        ORDER BY fecha_firmeza DESC NULLS LAST
      `)
    : { rows: [] as Sancion[] };

  const porProceso = await db.execute<Sancion>(sql`
    SELECT s.fuente, s.tipo, s.valor_sancion AS "valorSancion",
           s.fecha_firmeza::text AS "fechaFirmeza",
           s.entidad_nombre AS "entidadNombre", s.numero_acto AS "numeroActo",
           s.proveedor_nombre AS "proveedorNombre", s.url_proceso AS "urlProceso",
           h.secop_proceso_id AS "secopProcesoId"
    FROM al_sanciones s
    JOIN proceso pr ON pr.id = s.proceso_id
    JOIN al_oferentes_historico h
      ON h.secop_proceso_id = pr.secop_proceso_id
     AND h.adjudicado
    WHERE h.proveedor_key = ${key}
    ORDER BY s.fecha_firmeza DESC NULLS LAST
  `);

  return {
    directas: directas.rows,
    porProceso: porProceso.rows,
    tieneHallazgo: directas.rows.length > 0 || porProceso.rows.length > 0,
    cobertura: {
      cruzablePorDocumento: nit !== null,
      fuentesConsultadas: ["SECOP I - Multas y Sanciones", "SECOP II - Multas y Sanciones"],
      fuentesNoDisponibles: NO_DISPONIBLES,
    },
  };
}
