import Link from "next/link";
import { vistaFichaCard, type ProcesoParaCard } from "@/src/lib/secop/ficha-card";
import { compuertasAbsolutas } from "@/src/lib/secop/semaforo";
import Semaforo from "../semaforo/Semaforo";
import type { TipoProyecto } from "@/src/lib/classify/tipo-proyecto";

/**
 * La tarjeta de un proceso. Es el componente central del producto: lo usan la
 * vitrina, el hero y —en su variante compacta— las listas y el correo.
 *
 * ── Una sola cifra por eje ──────────────────────────────────────────────────
 * Donde hay semáforo no hay cuantía en el cuerpo: la compuerta de Cuantía ya la
 * enuncia, y repetirla fue el fallo que se corrigió en la fila densa. La
 * variante `compacta` no lleva semáforo, así que allí la cifra sí aparece.
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
  const conSemaforo = variante !== "compacta";

  return (
    <Link href={href} className={`fc fc--${variante}`}>
      <div className="fc-cab">
        <span className="fc-id">{v.id}</span>
        <span className={`fc-etapa fc-etapa--${v.etapa.clave}`}>{v.etapa.label}</span>
      </div>

      <p className="fc-entidad" title={v.entidad}>
        {v.entidad}
      </p>
      <p className="fc-objeto">{v.objeto}</p>

      {/* La adjudicación manda sobre el plazo: en un proceso ya resuelto, la
          ventana de ofertas no informa de nada. */}
      <p className="fc-plazo">{v.adjudicacion ?? v.plazo}</p>

      {conSemaforo ? (
        <>
          <div className="fc-sep" />
          <Semaforo compuertas={compuertasAbsolutas(proceso)} />
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
