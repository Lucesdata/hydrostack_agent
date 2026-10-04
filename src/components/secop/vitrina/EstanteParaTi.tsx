import Link from "next/link";
import type { EstanteParaTi as Estante } from "@/src/lib/secop/para-ti";
import type { GateStatus } from "@/src/lib/secop/verdict";

/**
 * «Para ti»: encima de los resultados de `/licitaciones`, sin filtros y en la
 * primera página, las coincidencias de la cuenta con su perfil (fase 3, tarea
 * 6). Plegable y abierto: quien vino a buscar otra cosa lo cierra de un clic.
 *
 * Del servidor y sin JavaScript. Solo se pinta para cuentas con perfil
 * guardado; sin perfil, el aviso «Define tu perfil» de la fase 1b ocupa su sitio.
 */

const ESTADO: Record<GateStatus, { texto: string; tono: string }> = {
  PASS: { texto: "Encaja", tono: "si" },
  WARN: { texto: "Revisar", tono: "revisar" },
  UNKNOWN: { texto: "Faltan datos", tono: "dato" },
  // getMatchesForPerfil ya descarta FAIL; está para que el mapa sea total.
  FAIL: { texto: "No encaja", tono: "no" },
};

export default function EstanteParaTi({ estante }: { estante: Estante }) {
  const { total, tarjetas } = estante;
  return (
    <details className="pt" open>
      <summary className="pt-resumen">
        Para ti{" "}
        <span className="pt-cuenta">
          ·{" "}
          {total === 0
            ? "nada encaja hoy"
            : `${total} ${total === 1 ? "encaja" : "encajan"} con tu perfil`}
        </span>
      </summary>
      {total === 0 ? (
        <p className="pt-vacio">
          Ninguno de los procesos abiertos encaja hoy con tu perfil.{" "}
          <Link href="/perfil">Revisa tu sector, zona y rango de valor</Link>.
        </p>
      ) : (
        <>
          <ul className="pt-lista">
            {tarjetas.map((t) => (
              <li key={t.id}>
                <Link className="pt-tarjeta" href={t.href}>
                  <span className={`pt-estado pt-estado--${ESTADO[t.overall].tono}`}>
                    {ESTADO[t.overall].texto}
                  </span>
                  <span className="pt-titulo">{t.titulo}</span>
                  <span className="pt-meta">
                    {t.entidad} · {t.lugar}
                  </span>
                  <span className="pt-valor">{t.presupuesto}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link className="pt-todas" href="/mis-coincidencias">
            {total > tarjetas.length
              ? `Ver las ${total} en Mis coincidencias →`
              : "Ver en Mis coincidencias →"}
          </Link>
        </>
      )}
    </details>
  );
}
