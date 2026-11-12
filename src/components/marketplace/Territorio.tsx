import Link from "next/link";
import type { ConsultaDisponible } from "@/src/lib/marketplace/tipos";
import type { OpcionTerritorio } from "@/src/lib/marketplace/territorios";
import type { FiltrosVitrina } from "@/src/lib/secop/filtros-vitrina";
import { conDepartamento, hrefMarketplace } from "@/src/lib/marketplace/url";
import s from "./marketplace.module.css";

const n = (v: number) => v.toLocaleString("es-CO");

/**
 * El selector territorial en HTML, equivalente al mapa: la región elegida con
 * su cifra y la salida a los resultados, una lista de todos los departamentos
 * como enlaces y las dos advertencias de alcance que el mapa no puede decir
 * (la ubicación es la de la entidad; hay procesos sin ubicación). Siempre está,
 * con o sin canvas, JavaScript o WebGL.
 */
export default function Territorio({
  datos,
  filtros,
  territorios,
}: {
  datos: ConsultaDisponible;
  filtros: FiltrosVitrina;
  territorios: OpcionTerritorio[];
}) {
  const sel = datos.departamentoSeleccionado;
  const quitar = hrefMarketplace(conDepartamento(filtros, null));

  return (
    <div className={s.resumenTerritorio}>
      {datos.departamentoInvalido ? (
        <p className={s.aviso} role="status">
          El departamento de la dirección no existe, así que no se aplicó.{" "}
          <Link href={quitar}>Retirar el filtro</Link>
        </p>
      ) : null}

      {sel ? (
        <p className={s.regionActiva} role="status">
          <strong>{sel.nombre}</strong>
          <span>
            {datos.total === 0
              ? "sin oportunidades con estos filtros"
              : `${n(datos.total)} ${datos.total === 1 ? "oportunidad" : "oportunidades"}`}
          </span>
          <a href="#resultados">Ver resultados</a>
          <Link href={quitar}>Quitar departamento</Link>
        </p>
      ) : (
        <p className={s.nota}>Elige un departamento en el mapa o en la lista.</p>
      )}

      <details className={s.listaTerritorios}>
        <summary>Ver por departamento</summary>
        <ul>
          {territorios.map((t) => (
            <li key={t.codigo}>
              <Link
                href={hrefMarketplace(conDepartamento(filtros, t.slug))}
                aria-current={sel?.codigo === t.codigo ? "true" : undefined}
              >
                <span>{t.nombre}</span>
                <span>{n(t.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </details>

      <p className={s.nota}>
        Ubicación de la entidad contratante, no del lugar de la obra.
        {datos.sinUbicacion > 0
          ? ` ${n(datos.sinUbicacion)} ${datos.sinUbicacion === 1 ? "proceso no tiene" : "procesos no tienen"} ubicación disponible: no aparecen en el mapa, sí en la consulta nacional.`
          : ""}
      </p>
    </div>
  );
}
