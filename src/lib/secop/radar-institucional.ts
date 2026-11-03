import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { entidad, geografia, proceso } from "@/src/lib/db/schema";
import { condicionAbierto } from "@/src/lib/secop/agregados";
import { claseDeEntidad } from "@/src/lib/secop/clase-entidad";

const inicioMes = sql`date_trunc('month', now() at time zone 'America/Bogota')::date`;
const inicioAnterior = sql`(date_trunc('month', now() at time zone 'America/Bogota') - interval '1 month')::date`;
export const periodoAnterior = () => new Intl.DateTimeFormat("es-CO", {month:"long",year:"numeric",timeZone:"America/Bogota"}).format(new Date(Date.now()-32*24*3600*1000));

/** Nunca mezcla presupuesto oficial y valor de adjudicación. */
export async function principalesAdjudicaciones(limite = 5) {
  const filas = await db.select({
    id: proceso.id, secopId: proceso.secopProcesoId, objeto: proceso.objeto,
    referencia: proceso.referencia, tipo: proceso.tipoProyecto,
    adjudicado: proceso.adjudicado, fecha: proceso.fechaAdjudicacion,
    valor: proceso.valorAdjudicacion, presupuesto: proceso.valorEstimado,
    adjudicatario: proceso.adjudicatario, url: proceso.url,
    entidadId: entidad.id, entidadNombre: entidad.nombre,
    departamento: geografia.departamentoNombre,
  }).from(proceso)
    .leftJoin(entidad, eq(entidad.id, proceso.entidadId))
    .leftJoin(geografia, eq(geografia.codigoDivipola, entidad.geografiaId))
    .where(and(isNull(proceso.deletedAt), eq(proceso.adjudicado, true),
      gte(proceso.fechaAdjudicacion, inicioAnterior),lt(proceso.fechaAdjudicacion,inicioMes),
      sql`${proceso.valorAdjudicacion} > 0`,
      sql`${proceso.tipoProyecto} in ('acueducto','alcantarillado','ptap','ptar')`))
    .orderBy(desc(proceso.valorAdjudicacion)).limit(limite);
  return filas.map(f=>({...f,valor:Number(f.valor), presupuesto:f.presupuesto?Number(f.presupuesto):null}));
}
export async function perfilEntidad(id:string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const [e] = await db.select({id:entidad.id,nombre:entidad.nombre,nit:entidad.nitCanonico,
    nivel:entidad.nivelGobierno,departamento:geografia.departamentoNombre,
    municipio:geografia.municipioNombre})
    .from(entidad).leftJoin(geografia,eq(entidad.geografiaId,geografia.codigoDivipola))
    .where(eq(entidad.id,id)).limit(1);
  if (!e) return null;
  const [abiertos, recientes, totales] = await Promise.all([
    db.select({id:proceso.id,secopId:proceso.secopProcesoId,objeto:proceso.objeto,
      tipo:proceso.tipoProyecto,valor:proceso.valorEstimado,fecha:proceso.fechaRecepcion})
      .from(proceso).where(and(eq(proceso.entidadId,id),condicionAbierto()))
      .orderBy(desc(proceso.fechaPublicacion)).limit(10),
    db.select({id:proceso.id,secopId:proceso.secopProcesoId,objeto:proceso.objeto,
      tipo:proceso.tipoProyecto,valor:proceso.valorAdjudicacion,fecha:proceso.fechaAdjudicacion,
      adjudicatario:proceso.adjudicatario})
      .from(proceso).where(and(eq(proceso.entidadId,id),isNull(proceso.deletedAt),
        eq(proceso.adjudicado,true))).orderBy(desc(proceso.fechaAdjudicacion)).limit(10),
    db.select({n:sql<number>`count(*)::int`,
      adjudicados:sql<number>`count(*) filter(where ${proceso.adjudicado}=true)::int`,
      valorAdjudicado:sql<string>`coalesce(sum(${proceso.valorAdjudicacion}) filter(where ${proceso.adjudicado}=true and ${proceso.valorAdjudicacion}>0),0)`})
      .from(proceso).where(and(eq(proceso.entidadId,id),isNull(proceso.deletedAt)))
  ]);
  return { ...e, clase:claseDeEntidad(e.nombre,e.nivel),
    abiertos:abiertos.map(p=>({...p,valor:p.valor?Number(p.valor):null})),
    recientes:recientes.map(p=>({...p,valor:p.valor?Number(p.valor):null})),
    resumen: {n:totales[0]?.n??0,adjudicados:totales[0]?.adjudicados??0,
       valorAdjudicado:Number(totales[0]?.valorAdjudicado??0)} };
}
