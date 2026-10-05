import type { ListasProcesos, ProcesoPersonal } from "@/src/lib/mis-procesos/types";
import { slugDeProceso } from "@/src/lib/secop/slug";
import { formatValorProceso } from "@/src/components/secop/format";
import {
  guardarPersonalAction,
  quitarPersonalAction,
  borrarRecientesAction,
} from "@/src/lib/mis-procesos/actions";
import styles from "./mis-procesos.module.css";
function Fila({ p }: { p: ProcesoPersonal }) {
  return (
    <li>
      <h3>
        {p.disponible ? (
          <a href={`/licitaciones/${slugDeProceso(p.objeto, p.procesoId)}`}>
            {p.objeto || p.referencia || p.procesoId}
          </a>
        ) : (
          p.objeto || p.procesoId
        )}
      </h3>
      <p>{p.entidad || "Entidad no publicada"}</p>
      <p>
        <span translate="no">
          {p.referencia ? `${p.referencia} · ` : ""}
          {p.procesoId}
        </span>
      </p>
      <p>
        {p.disponible
          ? p.estadoApertura || "Apertura por verificar"
          : "Este proceso ya no está disponible en AquaLicita."}
      </p>
      <p>
        {formatValorProceso({
          precioBase: p.valorEstimado ? Number(p.valorEstimado) : null,
          valorAdjudicacion: null,
        })}
      </p>
      {(p.guardado || p.disponible) && (
        <form action={p.guardado ? quitarPersonalAction : guardarPersonalAction}>
          <input type="hidden" name="id" value={p.procesoId} />
          <button className={styles.boton} type="submit">
            {p.guardado ? "Quitar de guardados" : "Guardar"}
          </button>
        </form>
      )}
    </li>
  );
}
export default function ListasMisProcesos({ listas }: { listas: ListasProcesos }) {
  const paginas = Math.max(1, Math.ceil(listas.totalGuardados / 25));
  return (
    <>
      <section className={styles.panel} aria-labelledby="guardados-titulo">
        <h2 id="guardados-titulo">Guardados</h2>
        <p>
          Los procesos que elegiste conservar. Guardar no activa correos ni seguimiento de cambios.
        </p>
        {listas.guardados.length ? (
          <ul className={styles.lista}>
            {listas.guardados.map((p) => (
              <Fila key={p.procesoId} p={p} />
            ))}
          </ul>
        ) : (
          <p>
            {listas.totalGuardados
              ? "Esta página no tiene procesos guardados."
              : "Todavía no guardaste ningún proceso."}
          </p>
        )}
        {paginas > 1 && (
          <nav className={styles.acciones} aria-label="Páginas de guardados">
            {listas.pagina > 1 && <a href={`/mis-procesos?page=${listas.pagina - 1}`}>Anterior</a>}
            <span>
              Página {listas.pagina} de {paginas}
            </span>
            {listas.pagina < paginas && (
              <a href={`/mis-procesos?page=${listas.pagina + 1}`}>Siguiente</a>
            )}
            <a href="/mis-procesos">Primera página</a>
          </nav>
        )}
      </section>
      <section className={styles.panel} aria-labelledby="recientes-titulo">
        <h2 id="recientes-titulo">Recientes</h2>
        <p>Tus últimas diez fichas abiertas. Visitar una ficha no la guarda.</p>
        {listas.recientes.length ? (
          <>
            <ul className={styles.lista}>
              {listas.recientes.map((p) => (
                <Fila key={p.procesoId} p={p} />
              ))}
            </ul>
            <details>
              <summary>Borrar recientes</summary>
              <p>Se borrará esta lista. Tus guardados se conservarán.</p>
              <form action={borrarRecientesAction}>
                <input type="hidden" name="confirmar" value="si" />
                <button className={styles.boton}>Confirmar borrado de recientes</button>
              </form>
            </details>
          </>
        ) : (
          <p>Aún no tienes fichas recientes.</p>
        )}
      </section>
    </>
  );
}
