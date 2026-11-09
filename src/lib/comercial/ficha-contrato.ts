/**
 * Ficha comercial de contrato (CI-11a). Lee SOLO lo ya ingerido (CONDUCTA §1) y
 * no necesita ninguna tabla `ci_*`: las necesidades de suministro se infieren al
 * vuelo con el clasificador puro de CI-01 y se muestran con su cita, rotuladas
 * «inferida», sin cantidades ni fechas (no existen en el texto).
 *
 * Reglas de privacidad: solo se nombra al contratista si su documento es NIT
 * (como `como-se-contrato.ts`); nunca se expone `raw_attrs.representante_legal`
 * ni nombres de supervisores u ordenadores del gasto.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { contrato, entidad, geografia, proceso, proveedor } from "@/src/lib/db/schema";
import { esPersonaJuridica } from "@/src/lib/secop/como-se-contrato";
import { clasificarTecnologia } from "@/src/lib/tecnologia/clasificador";
import { NODO_POR_CODIGO, type Naturaleza } from "@/src/lib/tecnologia/taxonomia-v1";

/** Id nativo de contrato de SECOP II. */
export const PATRON_ID_CONTRATO = /^CO1\.PCCNTR\.\d{1,12}$/;

export interface FilaContratoComercial {
  secopContratoId: string;
  objeto: string | null;
  url: string | null;
  estadoActual: string | null;
  valorInicial: string | null;
  valorActual: string | null;
  fechaFirma: string | null;
  fechaInicio: string | null;
  fechaFinActual: string | null;
  entidadNombre: string | null;
  municipio: string | null;
  departamento: string | null;
  tipoProyecto: string | null;
  proveedorRazonSocial: string | null;
  proveedorTipoDocumento: string | null;
  proveedorNit: string | null;
  proveedorNitDv: string | null;
  proveedorPlural: boolean | null;
}

export interface NecesidadInferida {
  codigo: string;
  nombre: string;
  naturaleza: Naturaleza;
  cita: string;
  estado: "inferida";
  calidadEvidencia: "C";
}

export interface FichaComercialContrato {
  id: string;
  objeto: string | null;
  urlSecop: string | null;
  estadoSecop: string | null;
  vigente: boolean | null;
  entidad: string | null;
  /** Sede de la entidad: la fuente no publica el lugar de ejecución. */
  ubicacionEntidad: string | null;
  tipoProyecto: string | null;
  valorInicial: number | null;
  valorActual: number | null;
  fechaFirma: string | null;
  fechaInicio: string | null;
  fechaFinActual: string | null;
  contratista:
    | { visible: true; nombre: string; nit: string; estructuraPlural: boolean }
    | { visible: false; nombre?: undefined; nit?: undefined; estructuraPlural?: undefined };
  tieneContratista: boolean;
  necesidades: NecesidadInferida[];
}

const num = (v: string | null): number | null => {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const dia = (v: string | null): string | null =>
  v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null;

/** Hoy en Colombia (YYYY-MM-DD), sin depender de la zona del servidor. */
export function hoyEnColombia(ahora: Date = new Date()): string {
  return ahora.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}

/** Puro: arma la ficha desde la fila ya leída. */
export function armarFichaComercial(f: FilaContratoComercial, hoy: string): FichaComercialContrato {
  const fin = dia(f.fechaFinActual);
  const persona = esPersonaJuridica(f.proveedorTipoDocumento);
  const nit = f.proveedorNit
    ? f.proveedorNitDv
      ? `${f.proveedorNit}-${f.proveedorNitDv}`
      : f.proveedorNit
    : null;

  const necesidades: NecesidadInferida[] = clasificarTecnologia(f.objeto).candidatos.flatMap(
    (c) => {
      const nodo = NODO_POR_CODIGO[c.codigo];
      return nodo
        ? [
            {
              codigo: c.codigo,
              nombre: nodo.nombre_es,
              naturaleza: nodo.naturaleza,
              cita: c.cita,
              estado: "inferida" as const,
              calidadEvidencia: "C" as const,
            },
          ]
        : [];
    }
  );

  const ubicacion = [f.municipio, f.departamento].filter(Boolean).join(", ");
  return {
    id: f.secopContratoId,
    objeto: f.objeto,
    urlSecop: f.url,
    estadoSecop: f.estadoActual,
    vigente: fin === null ? null : fin >= hoy,
    entidad: f.entidadNombre,
    ubicacionEntidad: ubicacion || null,
    tipoProyecto: f.tipoProyecto,
    valorInicial: num(f.valorInicial),
    valorActual: num(f.valorActual),
    fechaFirma: dia(f.fechaFirma),
    fechaInicio: dia(f.fechaInicio),
    fechaFinActual: fin,
    contratista:
      persona && f.proveedorRazonSocial && nit
        ? {
            visible: true,
            nombre: f.proveedorRazonSocial,
            nit,
            estructuraPlural: f.proveedorPlural === true,
          }
        : { visible: false },
    tieneContratista: f.proveedorRazonSocial !== null || f.proveedorTipoDocumento !== null,
    necesidades,
  };
}

/** Lee un contrato por su id nativo; `null` si el id no es válido, no existe o está borrado. */
export async function fichaComercialDeContrato(
  id: string,
  hoy: string = hoyEnColombia()
): Promise<FichaComercialContrato | null> {
  if (!PATRON_ID_CONTRATO.test(id)) return null;
  const [f] = await db
    .select({
      secopContratoId: contrato.secopContratoId,
      objeto: contrato.objeto,
      url: contrato.url,
      estadoActual: contrato.estadoActual,
      valorInicial: sql<string | null>`${contrato.valorInicial}::text`,
      valorActual: sql<string | null>`${contrato.valorActual}::text`,
      fechaFirma: sql<string | null>`${contrato.fechaFirma}::text`,
      fechaInicio: sql<string | null>`${contrato.fechaInicio}::text`,
      fechaFinActual: sql<string | null>`${contrato.fechaFinActual}::text`,
      entidadNombre: entidad.nombre,
      municipio: geografia.municipioNombre,
      departamento: geografia.departamentoNombre,
      tipoProyecto: proceso.tipoProyecto,
      proveedorRazonSocial: proveedor.razonSocial,
      proveedorTipoDocumento: proveedor.tipoDocumento,
      proveedorNit: proveedor.nitCanonico,
      proveedorNitDv: proveedor.nitDv,
      proveedorPlural: proveedor.esEstructuraPlural,
    })
    .from(contrato)
    .leftJoin(entidad, eq(entidad.id, contrato.entidadId))
    .leftJoin(
      geografia,
      eq(geografia.codigoDivipola, sql`coalesce(${entidad.geografiaId}, ${contrato.geografiaId})`)
    )
    .leftJoin(proceso, eq(proceso.id, contrato.procesoId))
    .leftJoin(proveedor, eq(proveedor.id, contrato.proveedorId))
    .where(and(eq(contrato.secopContratoId, id), isNull(contrato.deletedAt)))
    .limit(1);
  return f ? armarFichaComercial(f, hoy) : null;
}
