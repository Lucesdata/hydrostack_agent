import Link from "next/link";
import { formatCopEscala, formatCopFull } from "@/src/components/secop/format";
import { titulo } from "@/src/components/landing/texto";
import { colorDeTipo } from "@/src/lib/classify/tipo-color";
import { TIPO_PROYECTO } from "@/src/lib/classify/tipo-proyecto";
import { objetoLegible } from "@/src/lib/secop/ficha-card";
import { fechaLegible } from "@/src/lib/secop/etapa";
import { CUANTOS_ADJUDICADOS, type Adjudicado } from "@/src/lib/secop/adjudicados-mes";
import type { MesInforme } from "@/src/lib/secop/informe";

/**
 * «Proyectos adjudicados», pintado. Sin consultas: la página las hace y le pasa
 * el resultado, así se prueba con datos de ejemplo.
 *
 * Los colores son tokens de globals.css (los mide contraste.test.ts) y el color
 * del tipo de obra va siempre con su nombre escrito (regla de tipo-color.ts).
 */

const ESTILOS = `
.adj{ max-width: 920px; margin: 0 auto; color: var(--text-primary); }
.adj-eyebrow{ margin: 0 0 10px; font: 600 11px var(--font-jetbrains-mono), monospace; letter-spacing: .12em; color: var(--accent); }
.adj h1{ margin: 0; font: 700 clamp(1.9rem, 4vw, 2.6rem)/1.1 var(--font-inter), sans-serif; letter-spacing: -.02em; }
.adj-sub{ margin: 10px 0 0; max-width: 680px; font: 16px/1.5 var(--font-inter), sans-serif; color: var(--text-muted); }
.adj-lista{ list-style: none; margin: 32px 0 0; padding: 0; display: grid; gap: 14px; }
.adj-item{ display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 4px 16px; padding: 20px 22px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); }
.adj-pos{ grid-row: span 3; font: 700 30px/1 var(--font-jetbrains-mono), monospace; color: var(--text-muted); }
.adj-cab{ display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; font: 13px var(--font-inter), sans-serif; color: var(--text-muted); }
.adj-tipo{ display: inline-flex; align-items: center; gap: 7px; font-weight: 600; color: var(--text-primary); }
.adj-tipo i{ width: 9px; height: 9px; border-radius: 50%; background: var(--tipo); }
.adj-item h2{ margin: 6px 0 0; font: 600 17px/1.35 var(--font-inter), sans-serif; }
.adj-item h2 a{ color: inherit; text-decoration: none; }
.adj-item h2 a:hover{ text-decoration: underline; }
.adj-item h2 a:focus-visible{ outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 2px; }
.adj-entidad{ margin: 4px 0 0; font: 14px/1.45 var(--font-inter), sans-serif; color: var(--text-muted); }
.adj-datos{ grid-column: 2; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 14px 0 0; }
.adj-datos div{ min-width: 0; }
.adj-datos dt{ font: 600 11px var(--font-jetbrains-mono), monospace; letter-spacing: .06em; text-transform: uppercase; color: var(--text-muted); }
.adj-datos dd{ margin: 4px 0 0; font: 15px/1.35 var(--font-inter), sans-serif; overflow-wrap: anywhere; }
.adj-datos dd strong{ font-size: 20px; font-variant-numeric: tabular-nums; }
.adj-datos dd small{ display: block; margin-top: 2px; font-size: 12.5px; color: var(--text-muted); }
.adj-enlaces{ grid-column: 2; display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 14px 0 0; font: 600 14px var(--font-inter), sans-serif; }
.adj-enlaces a{ color: var(--accent); }
.adj-metodo{ margin: 36px 0 0; padding: 16px 20px; border: 1px dashed var(--border); border-radius: 10px; }
.adj-metodo h2{ margin: 0 0 8px; font: 700 15px var(--font-inter), sans-serif; }
.adj-metodo ul{ margin: 0; padding-left: 18px; font: 13.5px/1.6 var(--font-inter), sans-serif; color: var(--text-muted); }
.adj-vacio{ margin: 32px 0; color: var(--text-muted); }
@media (max-width: 640px){
  .adj-item{ grid-template-columns: 1fr; padding: 18px; }
  .adj-pos{ grid-row: auto; font-size: 22px; }
  .adj-datos, .adj-enlaces{ grid-column: 1; }
  .adj-datos{ grid-template-columns: 1fr 1fr; }
}
`;

const pct = (n: number) => `${n.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`;

function Tarjeta({ a, posicion }: { a: Adjudicado; posicion: number }) {
  const color = colorDeTipo(a.tipoProyecto);
  const lugar = [a.municipio, a.departamento].filter(Boolean).map((s) => titulo(s!)).join(", ");
  return (
    <li className="adj-item">
      <span className="adj-pos" aria-hidden="true">
        {posicion}
      </span>
      <div className="adj-cab">
        <span className="adj-tipo" style={{ ["--tipo" as string]: color?.claro }}>
          <i aria-hidden="true" />
          {TIPO_PROYECTO[a.tipoProyecto].label}
        </span>
        {a.fechaAdjudicacion && <span>Adjudicado el {fechaLegible(a.fechaAdjudicacion)}</span>}
        {a.referencia && <span>{a.referencia}</span>}
      </div>
      <div>
        <h2>
          <span className="sr-only">Puesto {posicion}: </span>
          <Link href={a.hrefFicha}>{objetoLegible(a.objeto, [a.entidad])}</Link>
        </h2>
        <p className="adj-entidad">
          {a.entidad ? titulo(a.entidad) : "Entidad no publicada"}
          {lugar && ` · ${lugar}`}
        </p>
      </div>
      <dl className="adj-datos">
        <div>
          <dt>Valor adjudicado</dt>
          <dd>
            <strong title={formatCopFull(a.valorAdjudicado)}>
              {formatCopEscala(a.valorAdjudicado)}
            </strong>
            {a.frentePresupuesto !== null && (
              <small>{pct(a.frentePresupuesto)} del presupuesto oficial</small>
            )}
          </dd>
        </div>
        <div>
          <dt>Presupuesto oficial</dt>
          <dd>{a.presupuesto ? formatCopEscala(a.presupuesto) : "No publicado"}</dd>
        </div>
        <div>
          <dt>Adjudicatario</dt>
          <dd>
            {a.adjudicatario ? (
              titulo(a.adjudicatario)
            ) : (
              <>
                No se nombra
                <small>Persona natural o sin NIT verificado</small>
              </>
            )}
          </dd>
        </div>
      </dl>
      <p className="adj-enlaces">
        <Link href={a.hrefFicha}>Ver ficha →</Link>
        {a.urlSecop && (
          <a href={a.urlSecop} target="_blank" rel="noopener noreferrer">
            Ver en el SECOP II ↗
          </a>
        )}
      </p>
    </li>
  );
}

export default function AdjudicadosVista({
  items,
  mes,
  generado,
}: {
  /** `null` si la base no respondió: se dice, no se inventa. */
  items: Adjudicado[] | null;
  mes: MesInforme;
  generado: string;
}) {
  return (
    <div className="clr-page">
      <article className="adj">
        <style dangerouslySetInnerHTML={{ __html: ESTILOS }} />
        <p className="adj-eyebrow">PROYECTOS ADJUDICADOS · {mes.etiqueta.toUpperCase()}</p>
        <h1>Los {CUANTOS_ADJUDICADOS} proyectos de agua y saneamiento más grandes del mes</h1>
        <p className="adj-sub">
          Los procesos de agua potable y saneamiento básico con mayor valor adjudicado en el SECOP
          II durante {mes.etiqueta}. Datos del SECOP II · actualizado el {generado}.
        </p>

        {items === null ? (
          <p className="adj-vacio">La lista no está disponible en este momento · —</p>
        ) : items.length === 0 ? (
          <p className="adj-vacio">
            No hay adjudicaciones de agua y saneamiento con valor publicado en {mes.etiqueta}.
          </p>
        ) : (
          <ol className="adj-lista">
            {items.map((a, i) => (
              <Tarjeta key={a.secopProcesoId} a={a} posicion={i + 1} />
            ))}
          </ol>
        )}

        <section className="adj-metodo" aria-labelledby="adj-metodo">
          <h2 id="adj-metodo">Cómo se eligen</h2>
          <ul>
            <li>
              Procesos marcados como adjudicados en el SECOP II con fecha de adjudicación en{" "}
              {mes.etiqueta} (hora de Colombia).
            </li>
            <li>
              Solo obras de acueducto, alcantarillado, plantas de potabilización (PTAP) y plantas de
              tratamiento de aguas residuales (PTAR), según el tipo de proyecto de cada ficha.
            </li>
            <li>
              Se ordenan por el valor adjudicado que publica el SECOP II; los procesos sin valor no
              compiten. El valor adjudicado no es el valor final del contrato ni su avance.
            </li>
            <li>
              El adjudicatario solo se nombra si es una persona jurídica con NIT. La ubicación es la
              de la entidad contratante, no necesariamente la de la obra.
            </li>
          </ul>
        </section>
      </article>
    </div>
  );
}
