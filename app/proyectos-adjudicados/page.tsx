import Link from "next/link";
import { principalesAdjudicaciones } from "@/src/lib/secop/radar-institucional";
import { formatCopEscala } from "@/src/components/secop/format";
import { slugificar } from "@/src/lib/secop/slug";
import "@/src/components/secop/radar/radar.css";
export const revalidate=21600;
export const metadata={title:"Proyectos adjudicados de agua y saneamiento",description:"Los cinco mayores procesos adjudicados de agua potable y saneamiento del mes anterior, según registros SECOP II.",alternates:{canonical:"/proyectos-adjudicados"}};
const tipos:Record<string,string>={acueducto:"Acueducto",alcantarillado:"Alcantarillado",ptap:"PTAP",ptar:"PTAR"};
const fecha=(s:string|null)=>s?new Intl.DateTimeFormat("es-CO",{timeZone:"UTC",day:"numeric",month:"short",year:"numeric"}).format(new Date(s+"T12:00:00Z")):"Fecha no publicada";
export default async function Page(){
 let datos:Awaited<ReturnType<typeof principalesAdjudicaciones>>|null=null;
 try{datos=await principalesAdjudicaciones()}catch(e){console.error("[adjudicados] fuente no disponible",e)}
 const mes=new Intl.DateTimeFormat("es-CO",{month:"long",year:"numeric",timeZone:"America/Bogota"}).format(new Date(Date.UTC(new Date().getUTCFullYear(),new Date().getUTCMonth()-1,15)));
 return <div className="ri-page">
  <header className="ri-hero"><div className="ri-shell"><span className="ri-eyebrow">SECOP II · {mes}</span><h1>Los proyectos de agua y saneamiento <span style={{color:"#008e8e"}}>más grandes del mes</span></h1><p>Los cinco mayores valores adjudicados de acueducto, alcantarillado, PTAP y PTAR. Ordenados por valor de adjudicación publicado, no por presupuesto oficial.</p></div></header>
  <div className="ri-shell ri-section"><div className="ri-tabs"><Link href="/licitaciones/entidades" className="ri-tab">Radar institucional ↗</Link><Link href="/licitaciones" className="ri-tab">Explorar procesos ↗</Link></div>
  <h2 className="ri-title">Top 5 · {mes}</h2><p className="ri-muted">Cifras reales disponibles en AquaLicita, procedentes de SECOP II. El orden puede cambiar cuando la fuente actualice los registros.</p>
  {datos===null?<div className="ri-empty">No es posible consultar los registros en este momento. No se muestran valores de ejemplo.</div>:datos.length===0?<div className="ri-empty">No hay adjudicaciones con valor positivo y fecha verificada en el periodo seleccionado.</div>:
   <div className="ri-stack" style={{marginTop:25}}>{datos.map((p,i)=><article key={p.id} className="ri-card" style={i===0?{background:"linear-gradient(110deg,#003b46,#007b7b)",color:"#fff",borderColor:"#007b7b"}:{}}>
     <div className="ri-process" style={{gridTemplateColumns:"50px minmax(0,1fr) minmax(130px,200px)"}}>
      <span className="ri-rank" style={i===0?{color:"#9af5e7"}:{}}>{String(i+1).padStart(2,"0")}</span>
      <div><span className="ri-chip">{tipos[p.tipo??""]??"Agua y saneamiento"}</span><h3 style={{fontSize:19}}>{p.objeto||"Proceso sin objeto publicado"}</h3>
        <p style={i===0?{color:"#cdecea"}:{}}>{p.entidadNombre||"Entidad sin identificar"} · {p.departamento||"Sede por verificar"} · {fecha(p.fecha)}</p>
        <p style={{marginTop:6,...(i===0?{color:"#cdecea"}:{})}}>Referencia: {p.referencia||p.secopId}</p>
        <div style={{display:"flex",gap:16,marginTop:13,flexWrap:"wrap"}}>
          <Link className="ri-button" href={`/licitaciones/${slugificar(p.objeto||"proceso")}-${p.secopId}`}>Ver ficha →</Link>
          {p.entidadId?<Link href={`/entidades/${p.entidadId}`} className="ri-button ri-button--outline">Ver entidad</Link>:null}
          {p.url?.startsWith("https://")?<a href={p.url} className="ri-button ri-button--outline" target="_blank" rel="noopener noreferrer">Ver SECOP II ↗</a>:null}
        </div></div>
      <div><span className="ri-eyebrow" style={i===0?{color:"#a7eae5"}:{}}>Valor adjudicado</span><strong style={{fontSize:25,display:"block",margin:"8px 0"}}>{formatCopEscala(p.valor)}</strong><p style={i===0?{color:"#cdecea"}:{}}>Presupuesto oficial: {p.presupuesto?formatCopEscala(p.presupuesto):"No publicado"}</p><p style={i===0?{color:"#cdecea"}:{}}>Adjudicatario: {p.adjudicatario||"Por verificar"}</p></div>
     </div></article>)}</div>}
  <aside className="ri-criteria"><strong>Cómo se eligen</strong><p>Procesos con estado adjudicado, fecha de adjudicación del mes anterior en hora de Colombia, tipo acueducto, alcantarillado, PTAP o PTAR y valor adjudicado positivo. La cifra no es el valor pagado ni acredita avance de obra. La localización es la sede de la entidad cuando está disponible.</p></aside>
 </div></div>
}