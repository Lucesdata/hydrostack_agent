import Link from "next/link";
import { formatCopCompact } from "@/src/components/secop/format";
import { COLOR_TIPO, colorDeTipo } from "@/src/lib/classify/tipo-color";
import { TIPO_PROYECTO, type TipoProyecto } from "@/src/lib/classify/tipo-proyecto";
import { ilustracionDeTipo } from "@/src/lib/marketplace/familias";
import type { Oportunidad } from "@/src/lib/marketplace/tipos";
import { vistaFichaCard } from "@/src/lib/secop/ficha-card";
import { montoConDato } from "@/src/lib/secop/monto";
import s from "./marketplace.module.css";

/**
 * Una oportunidad. Datos reales de SECOP II (objeto, entidad, valor, plazo); la
 * única parte ilustrativa es la foto, y lo dice en cada tarjeta que la usa
 * («Imagen ilustrativa»). Sin tipo confirmado no hay foto: queda el fondo
 * neutro. El título es el enlace canónico a la Ficha Viva y su zona de clic
 * cubre la tarjeta; el pie lo repite en palabras («Ver Ficha Viva»).
 */
export default function TarjetaOportunidad({ o, hoy }: { o: Oportunidad; hoy: Date }) {
  const vista = vistaFichaCard(
    {
      secopProcesoId: o.id,
      objeto: o.objeto || null,
      entidadNombre: o.entidad,
      departamento: o.departamento,
      municipio: o.municipio,
      valorEstimado: o.precioBaseCop,
      estadoActual: o.estado,
      estadoApertura: o.estadoApertura,
      fechaRecepcion: o.fechaRecepcion,
      fechaPublicacion: o.fechaPublicacion,
      etapaCalculada: o.etapaCalculada,
    },
    hoy
  );
  const color = colorDeTipo(o.tipo);
  const conocido = o.tipo && o.tipo in COLOR_TIPO ? (o.tipo as TipoProyecto) : null;
  // `otros` no afirma ningún subsistema: se dice con las palabras de la leyenda.
  const tipoTexto = !conocido
    ? "Sin tipo confirmado"
    : conocido === "otros"
      ? (color?.familiaLabel ?? "Sin tipo confirmado")
      : `${color?.familiaLabel ?? ""} · ${TIPO_PROYECTO[conocido].label}`;
  const foto = ilustracionDeTipo(o.tipo);
  const monto = montoConDato(o.precioBaseCop);
  const lugar = [o.municipio, o.departamento].filter(Boolean).join(", ");
  const sinRecibir = vista.etapa.clave !== "abierto";

  return (
    <article className={s.tarjeta} data-sin-foto={foto ? undefined : true}>
      <div className={s.foto}>
        {foto ? (
          <>
            {/* Variantes de 640 y 1280 px ya exportadas (ASSETS.md); el `srcset` es el del inventario. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.src640}
              srcSet={`${foto.src640} 640w, ${foto.src} 1280w`}
              sizes="(min-width: 1024px) 160px, (min-width: 640px) 200px, 100vw"
              width={foto.ancho}
              height={foto.alto}
              alt=""
              loading="lazy"
              decoding="async"
            />
            <span className={s.ilustrativa}>Imagen ilustrativa</span>
          </>
        ) : null}
      </div>
      <div className={s.cuerpo}>
        <p className={s.pastillas}>
          <span
            className={s.tipo}
            style={color ? { ["--color-familia" as string]: color.oscuro } : undefined}
          >
            {tipoTexto}
          </span>
          {sinRecibir ? <span className={s.estado}>{vista.etapa.label}</span> : null}
        </p>
        <h3 className={s.titulo}>
          <Link href={o.fichaHref} title={vista.objetoOriginal ?? undefined}>
            {vista.objeto}
          </Link>
        </h3>
        <p className={s.entidad}>{vista.entidad}</p>
        <p className={s.lugar}>
          <span className={s.rotulo}>Sede de la entidad</span> {lugar || "No informada"}
        </p>
        <dl className={s.datosTarjeta}>
          <div>
            <dt>Valor estimado</dt>
            <dd>{monto === null ? "No publicado" : formatCopCompact(monto)}</dd>
          </div>
          <div>
            <dt>Cierre de ofertas</dt>
            <dd data-urgente={vista.cierre.urgente || undefined}>
              {vista.cierre.valor}
              {vista.cierre.detalle ? <small> · {vista.cierre.detalle}</small> : null}
            </dd>
          </div>
        </dl>
        <p className={s.pie}>
          <span>Ver Ficha Viva</span>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
            <path
              d="M5 12h14m-5-5 5 5-5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </p>
      </div>
    </article>
  );
}
