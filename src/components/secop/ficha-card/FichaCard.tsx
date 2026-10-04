import Link from "next/link";
import { vistaFichaCard, type ProcesoParaCard } from "@/src/lib/secop/ficha-card";
import { compuertasAbsolutas } from "@/src/lib/secop/semaforo";
import Semaforo from "../semaforo/Semaforo";
import { TIPO_PROYECTO, type TipoProyecto } from "@/src/lib/classify/tipo-proyecto";
import { colorDeTipo } from "@/src/lib/classify/tipo-color";
import { EncajeTarjeta } from "../vitrina/EncajeVitrina";

/**
 * La tarjeta de un proceso. Es el componente central del producto: lo usan la
 * vitrina, el hero y —en su variante compacta— las listas y el correo.
 *
 * ── Una sola cifra por eje ──────────────────────────────────────────────────
 * Donde hay semáforo no hay cuantía en el cuerpo: la compuerta de Cuantía ya la
 * enuncia, y repetirla fue el fallo que se corrigió en la fila densa. Solo la
 * variante `destacada` lleva semáforo; las demás pintan la cuantía.
 *
 * ── La vitrina, sin semáforo (2026-10-04) ───────────────────────────────────
 * En la vitrina las cinco compuertas absolutas salían con el mismo punto azul
 * (estado `DATO`) y «Habilitación SIN DATOS» en todas: parecían un indicador y
 * no distinguían una tarjeta de otra. Ahora la tarjeta dice tipo de obra (con
 * su color de familia y su nombre), ubicación y presupuesto. El veredicto con
 * perfil sigue en la ficha.
 *
 * ── Un solo enlace ──────────────────────────────────────────────────────────
 * Toda la tarjeta es el enlace, así que nada de dentro puede serlo. El semáforo
 * va en `disposicion="linea"`, la única que no renderiza un `<Link>`.
 */

export type VarianteFicha = "destacada" | "vitrina" | "compacta";

export interface FichaCardProps {
  proceso: ProcesoParaCard & { tipoProyecto: TipoProyecto | null };
  href: string;
  variante?: VarianteFicha;
  /** Inyectable para que la cuenta atrás sea determinista en pruebas. */
  hoy?: Date;
}

export default function FichaCard({
  proceso,
  href,
  variante = "vitrina",
  hoy = new Date(),
}: FichaCardProps) {
  const v = vistaFichaCard(proceso, hoy);
  const conSemaforo = variante === "destacada";
  const tipo =
    proceso.tipoProyecto && TIPO_PROYECTO[proceso.tipoProyecto] ? proceso.tipoProyecto : null;
  const color = colorDeTipo(tipo);

  return (
    <Link href={href} className={`fc fc--${variante}`}>
      <div className="fc-cab">
        <span className="fc-id">
          {v.id}
          {v.nuevo && variante === "vitrina" && <span className="fc-nuevo">Nuevo</span>}
        </span>
        <span className={`fc-etapa fc-etapa--${v.etapa.clave}`}>{v.etapa.label}</span>
      </div>

      <p className="fc-entidad" title={v.entidad}>
        {v.entidad}
      </p>
      <p className="fc-objeto" title={v.objetoOriginal ?? undefined}>
        {v.objeto}
      </p>

      {/* La adjudicación manda sobre el plazo: en un proceso ya resuelto, la
          ventana de ofertas no informa de nada. En la vitrina, sin adjudicación,
          el plazo va en grande en la columna «Cierre de ofertas». */}
      {(variante !== "vitrina" || v.adjudicacion) && (
        <p className="fc-plazo">{v.adjudicacion ?? v.plazo}</p>
      )}

      {conSemaforo ? (
        <>
          <div className="fc-sep" />
          <Semaforo compuertas={compuertasAbsolutas(proceso)} />
        </>
      ) : variante === "vitrina" ? (
        <>
          <div className="fc-sep" />
          <div className="fc-datos">
            <div className="fc-cifras">
              <div className="fc-cifra">
                <span className="fc-cifra-k">Presupuesto</span>
                <span className={v.cuantiaPublicada ? "fc-cifra-v" : "fc-cifra-v fc-cifra-v--sin"}>
                  {v.cuantiaPublicada ? v.cuantia : "No publicado"}
                </span>
              </div>
              {!v.adjudicacion && (
                <div className="fc-cifra">
                  <span className="fc-cifra-k">Cierre de ofertas</span>
                  <span
                    className={`fc-cifra-v${v.cierre.urgente ? " fc-cifra-v--urgente" : ""}${
                      v.cierre.apagado ? " fc-cifra-v--sin" : ""
                    }`}
                  >
                    {v.cierre.valor}
                  </span>
                  {v.cierre.detalle && <span className="fc-cifra-d">{v.cierre.detalle}</span>}
                </div>
              )}
            </div>
            <span className="fc-meta">
              <span className="fc-tipo">
                {/* El color nunca va solo: el nombre del tipo va al lado (tipo-color.ts). */}
                <span
                  className={`fc-tipo-punto${color?.familia === "otros" || !color ? " fc-tipo-punto--otros" : ""}`}
                  style={
                    color && color.familia !== "otros" ? { background: color.claro } : undefined
                  }
                  aria-hidden="true"
                />
                {tipo ? TIPO_PROYECTO[tipo].label : "Tipo sin clasificar"}
              </span>
              <span className="fc-lugar">{v.ubicacion}</span>
            </span>
            <EncajeTarjeta id={v.id} />
          </div>
        </>
      ) : (
        <p className="fc-cuantia">{v.cuantia}</p>
      )}

      <div className="fc-pie">
        <span className="fc-ver">Ver ficha →</span>
      </div>
    </Link>
  );
}
