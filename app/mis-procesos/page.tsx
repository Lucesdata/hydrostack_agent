import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { nivelDe, puede } from "@/src/lib/acceso/politica";
import { listarMisProcesos } from "@/src/lib/mis-procesos/store";
import { validarId, validarPagina } from "@/src/lib/mis-procesos/validacion";
import { rutaInterna } from "@/src/lib/mis-procesos/retorno";
import { guardarPersonalAction } from "@/src/lib/mis-procesos/actions";
import ProcesosCuenta from "@/src/components/mis-procesos/ProcesosCuenta";
import ProteccionLista from "@/src/components/mis-procesos/ProteccionLista";
import ListasActualizadas from "@/src/components/mis-procesos/ListasActualizadas";
import styles from "@/src/components/mis-procesos/mis-procesos.module.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Mis procesos — AquaLicita" };
export default async function MisProcesosPage({
  searchParams = {},
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const user = await getSessionUser();
  if (!puede(nivelDe(user, null), "procesos_guardar") || !user) {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams))
      if (typeof v === "string" && ["guardar", "volver", "page"].includes(k)) next.set(k, v);
    redirect(`/login?next=${encodeURIComponent(`/mis-procesos${next.size ? `?${next}` : ""}`)}`);
  }
  let listas = null,
    error = "",
    intencion = "";
  try {
    const page = validarPagina(searchParams.page);
    if (searchParams.guardar) intencion = validarId(searchParams.guardar);
    listas = await listarMisProcesos(user.id, page);
  } catch (e) {
    console.error("[mis-procesos] Listas no disponibles", e);
    error = "No pudimos cargar tus procesos. Inténtalo de nuevo.";
  }
  const volver = rutaInterna(searchParams.volver);
  const avisos: Record<string, string> = {
    servicio: "No pudimos confirmar el cambio. Inténtalo de nuevo.",
    criterios: "Revisa los datos antes de confirmar.",
    retirado: "El proceso ya no está disponible para guardarlo.",
  };
  const aviso = typeof searchParams.error === "string" ? avisos[searchParams.error] : null;
  return (
    <main className="clr-page">
      <div className={`clr-container ${styles.personal}`}>
        <h1 className="clr-h1">Mis procesos</h1>
        <p className="clr-sub">Guardados y últimas fichas visitadas, con tu cuenta gratuita.</p>
        <a href="/licitaciones/explorar">Buscar otros procesos</a>
        {!intencion && searchParams.volver && <a href={volver}>Volver a la búsqueda</a>}
        {aviso && <p role="alert">{aviso}</p>}
        {searchParams.aviso === "ok" && <p role="status">Cambio confirmado.</p>}
        {error ? (
          <p role="alert">
            {error} <a href="/mis-procesos">Reintentar</a>
          </p>
        ) : (
          listas && (
            <ProcesosCuenta
              pagina={listas.pagina}
              ids={[...listas.guardados, ...listas.recientes].map((p) => p.procesoId)}
            >
              <ProteccionLista usuarioId={user.id}>
                {intencion && (
                  <section className={styles.confirmar} aria-label="Confirmar guardado">
                    <h2>Confirmar guardado</h2>
                    <p>
                      ¿Quieres guardar el proceso <span translate="no">{intencion}</span> en esta
                      cuenta?
                    </p>
                    <p>Guardar no activa alertas por correo.</p>
                    <form action={guardarPersonalAction}>
                      <input type="hidden" name="id" value={intencion} />
                      <input type="hidden" name="volver" value={volver} />
                      <button className={styles.boton}>Confirmar guardado</button>
                    </form>
                    <div className={styles.acciones}>
                      <a href="/mis-procesos">Cancelar</a>
                      <a href={volver}>Volver a la búsqueda</a>
                    </div>
                  </section>
                )}
                <ListasActualizadas iniciales={listas} />
              </ProteccionLista>
            </ProcesosCuenta>
          )
        )}
      </div>
    </main>
  );
}
