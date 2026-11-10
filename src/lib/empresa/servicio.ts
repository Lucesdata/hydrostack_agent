/**
 * Servicio del perfil de empresa comercial (CI-05). Es la ÚNICA puerta de lectura
 * y escritura de `ci_empresa*`: la acción de servidor y, más adelante, las APIs
 * pasan por aquí, así que el aislamiento por cuenta vive en un solo sitio.
 *
 * Reglas (R8, CLAUDE.md §4 — la única defensa multi-tenant es el filtro por
 * usuario en cada consulta):
 *  · Toda consulta parte de `usuarioId`, que lo pone la SESIÓN, nunca el cliente.
 *    No hay ninguna función que reciba un `empresaId` externo.
 *  · El cliente no fija estados: lo que escribe nace `declarado`. Un dato
 *    `documentado`/`verificado` (lo fija la verificación) solo se conserva si el
 *    usuario lo re-guarda SIN cambiarlo; si lo cambia, vuelve a `declarado`.
 *  · Cambiar la identidad (razón social, país, registro) de una empresa
 *    `verificada` la devuelve a `en_revision`. Una `rechazada`/`revocada` no se
 *    rehabilita editando el perfil.
 *  · Guardar es transaccional y serializado por cuenta (advisory lock).
 *  · Cada guardado deja una fila en `ci_auditoria` con conteos, nunca el
 *    contenido del perfil.
 */
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import {
  ciAuditoria,
  ciEmpresa,
  ciEmpresaCapacidad,
  ciEmpresaCobertura,
  ciEmpresaRol,
} from "@/src/lib/db/schema";
import { TAXONOMIA_VERSION } from "@/src/lib/tecnologia/taxonomia-v1";
import {
  completitud,
  validarEntradaEmpresa,
  type Completitud,
  type ErrorValidacion,
} from "./validar";

export type EstadoDato = "declarado" | "documentado" | "verificado";

export interface EmpresaGuardada {
  id: string;
  razonSocial: string;
  pais: string;
  registroEmpresarial: string | null;
  sitioOficial: string | null;
  coberturaNacional: boolean;
  estadoVerificacion: string;
  atributos: Record<string, { valor: string[]; estado: EstadoDato }>;
  roles: { rol: string; estadoDato: EstadoDato }[];
  capacidades: {
    nodoCodigo: string;
    taxonomiaVersion: string;
    estadoDato: EstadoDato;
    marcas: string[];
    especificaciones: Record<string, unknown> | null;
  }[];
  cobertura: { divipola: string; estadoDato: EstadoDato }[];
  completitud: Completitud;
}

/** Ver nota de `ResultadoValidacion`: el repo compila con `strict: false`. */
export type ResultadoGuardar =
  | { ok: true; creada: boolean; empresa: EmpresaGuardada; error?: undefined; errores?: undefined }
  | {
      ok: false;
      error: "VALIDACION";
      errores: ErrorValidacion[];
      creada?: undefined;
      empresa?: undefined;
    };

/** JSON con las claves ordenadas, para comparar objetos sin depender del orden de jsonb. */
function estable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(estable).join(",")}]`;
  if (v !== null && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${estable(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

export async function obtenerEmpresa(usuarioId: string): Promise<EmpresaGuardada | null> {
  return leer(db, usuarioId);
}

// `tx` y `db` comparten la superficie de consulta que se usa aquí.
type Lector = Pick<typeof db, "select">;

async function leer(c: Lector, usuarioId: string): Promise<EmpresaGuardada | null> {
  const [e] = await c.select().from(ciEmpresa).where(eq(ciEmpresa.usuarioId, usuarioId)).limit(1);
  if (!e) return null;
  const [roles, caps, cob] = await Promise.all([
    c
      .select()
      .from(ciEmpresaRol)
      .where(eq(ciEmpresaRol.empresaId, e.id))
      .orderBy(asc(ciEmpresaRol.rol)),
    c
      .select()
      .from(ciEmpresaCapacidad)
      .where(eq(ciEmpresaCapacidad.empresaId, e.id))
      .orderBy(asc(ciEmpresaCapacidad.nodoCodigo)),
    c
      .select()
      .from(ciEmpresaCobertura)
      .where(eq(ciEmpresaCobertura.empresaId, e.id))
      .orderBy(asc(ciEmpresaCobertura.divipola)),
  ]);
  const empresa: Omit<EmpresaGuardada, "completitud"> = {
    id: e.id,
    razonSocial: e.razonSocial,
    pais: e.pais,
    registroEmpresarial: e.registroEmpresarial,
    sitioOficial: e.sitioOficial,
    coberturaNacional: e.coberturaNacional,
    estadoVerificacion: e.estadoVerificacion,
    atributos: e.atributos as EmpresaGuardada["atributos"],
    roles: roles.map((r) => ({ rol: r.rol, estadoDato: r.estadoDato as EstadoDato })),
    capacidades: caps.map((x) => ({
      nodoCodigo: x.nodoCodigo,
      taxonomiaVersion: x.taxonomiaVersion,
      estadoDato: x.estadoDato as EstadoDato,
      marcas: x.marcas ?? [],
      especificaciones: (x.especificaciones as Record<string, unknown> | null) ?? null,
    })),
    cobertura: cob.map((x) => ({ divipola: x.divipola, estadoDato: x.estadoDato as EstadoDato })),
  };
  return {
    ...empresa,
    completitud: completitud({
      roles: empresa.roles,
      capacidades: empresa.capacidades,
      cobertura: empresa.cobertura,
      coberturaNacional: empresa.coberturaNacional,
    }),
  };
}

export async function guardarEmpresa(
  usuarioId: string,
  entrada: unknown
): Promise<ResultadoGuardar> {
  const v = validarEntradaEmpresa(entrada);
  if (!v.ok) return { ok: false, error: "VALIDACION", errores: v.errores };
  const nueva = v.valor;

  const creada = await db.transaction(async (tx) => {
    // Un guardado a la vez por cuenta: sin esto dos pestañas podrían chocar al
    // reemplazar los hijos.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`ci_empresa:${usuarioId}`}))`);

    const previo = await leer(tx, usuarioId);

    // Estado de verificación: solo baja a revisión por cambio de identidad.
    const cambioIdentidad =
      previo !== null &&
      (previo.razonSocial !== nueva.razonSocial ||
        previo.pais !== nueva.pais ||
        previo.registroEmpresarial !== nueva.registroEmpresarial);
    const estadoVerificacion =
      previo === null
        ? "sin_verificar"
        : cambioIdentidad && previo.estadoVerificacion === "verificada"
          ? "en_revision"
          : previo.estadoVerificacion;

    // Atributos: cada campo `{valor, estado}`; el estado previo sobrevive si el valor no cambió.
    const atributos: EmpresaGuardada["atributos"] = {};
    for (const [clave, valor] of Object.entries(nueva.atributos)) {
      const antes = previo?.atributos[clave];
      const igual = antes !== undefined && estable(antes.valor) === estable(valor);
      atributos[clave] = { valor, estado: igual ? antes.estado : "declarado" };
    }

    const [fila] = await tx
      .insert(ciEmpresa)
      .values({
        usuarioId,
        razonSocial: nueva.razonSocial,
        pais: nueva.pais,
        registroEmpresarial: nueva.registroEmpresarial,
        sitioOficial: nueva.sitioOficial,
        coberturaNacional: nueva.coberturaNacional,
        estadoVerificacion,
        atributos,
      })
      .onConflictDoUpdate({
        target: ciEmpresa.usuarioId,
        set: {
          razonSocial: nueva.razonSocial,
          pais: nueva.pais,
          registroEmpresarial: nueva.registroEmpresarial,
          sitioOficial: nueva.sitioOficial,
          coberturaNacional: nueva.coberturaNacional,
          estadoVerificacion,
          atributos,
          updatedAt: new Date(),
        },
      })
      .returning({ id: ciEmpresa.id });

    // Hijos: se reemplazan, conservando el estado previo solo de lo que no cambió.
    await tx.delete(ciEmpresaRol).where(eq(ciEmpresaRol.empresaId, fila.id));
    await tx.delete(ciEmpresaCapacidad).where(eq(ciEmpresaCapacidad.empresaId, fila.id));
    await tx.delete(ciEmpresaCobertura).where(eq(ciEmpresaCobertura.empresaId, fila.id));

    if (nueva.roles.length > 0) {
      await tx.insert(ciEmpresaRol).values(
        nueva.roles.map((rol) => ({
          empresaId: fila.id,
          rol,
          estadoDato: previo?.roles.find((r) => r.rol === rol)?.estadoDato ?? "declarado",
        }))
      );
    }
    if (nueva.capacidades.length > 0) {
      await tx.insert(ciEmpresaCapacidad).values(
        nueva.capacidades.map((c) => {
          const antes = previo?.capacidades.find((x) => x.nodoCodigo === c.nodoCodigo);
          const igual =
            antes !== undefined &&
            estable([...antes.marcas].sort()) === estable([...c.marcas].sort()) &&
            estable(antes.especificaciones) === estable(c.especificaciones);
          return {
            empresaId: fila.id,
            nodoCodigo: c.nodoCodigo,
            taxonomiaVersion: TAXONOMIA_VERSION,
            estadoDato: igual ? antes.estadoDato : "declarado",
            marcas: c.marcas,
            especificaciones: c.especificaciones,
          };
        })
      );
    }
    if (nueva.cobertura.length > 0) {
      await tx.insert(ciEmpresaCobertura).values(
        nueva.cobertura.map((divipola) => ({
          empresaId: fila.id,
          divipola,
          estadoDato:
            previo?.cobertura.find((c) => c.divipola === divipola)?.estadoDato ?? "declarado",
        }))
      );
    }

    // Solo conteos: la auditoría nunca copia el contenido del perfil.
    await tx.insert(ciAuditoria).values({
      actorTipo: "usuario",
      actorId: usuarioId,
      accion: previo === null ? "empresa.creada" : "empresa.guardada",
      objetoTipo: "empresa",
      objetoId: fila.id,
      detalle: {
        roles: nueva.roles.length,
        capacidades: nueva.capacidades.length,
        cobertura: nueva.cobertura.length,
      },
    });

    return previo === null;
  });

  const empresa = await obtenerEmpresa(usuarioId);
  if (!empresa) throw new Error("La empresa recién guardada no se pudo leer");
  return { ok: true, creada, empresa };
}
