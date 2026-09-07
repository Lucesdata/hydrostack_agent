/**
 * Mis filtros (SDD §4.2) — la pantalla que faltaba para usar el motor.
 *
 * Server component: resuelve sesión y carga inicial; la interacción vive en
 * `FiltrosCliente`. Mismo patrón que `/mis-coincidencias`.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { nivelDe, puede } from "@/src/lib/acceso/politica";
import { cuentaDe } from "@/src/lib/al/cuenta";
import { listarFiltros } from "@/src/lib/al/filtros/store";
import { FiltrosCliente, type Filtro } from "./FiltrosCliente";
import { STYLE } from "./estilos";

export const dynamic = "force-dynamic";

export const metadata = { title: "Mis filtros · AquaLicita" };

export default async function MisFiltrosPage() {
  const user = await getSessionUser();
  if (!puede(nivelDe(user, null), "filtros")) redirect("/login?next=/mis-filtros");

  const filtros = (await listarFiltros(cuentaDe(user))) as unknown as Filtro[];

  return (
    <main className="clr-flt">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="clr-flt-inner">
        <h1 className="clr-flt-title">Mis filtros</h1>
        <p className="clr-flt-sub">
          Cada filtro define qué licitaciones de agua y saneamiento te interesan. El correo diario
          agrega en un solo mensaje las novedades de todos: primero las adendas de lo que ya sigues,
          luego las adjudicaciones y al final lo nuevo que casa.{" "}
          <Link className="clr-flt-link" href="/mis-coincidencias">
            Ver mis coincidencias
          </Link>
        </p>

        <FiltrosCliente inicial={filtros} />

        <p className="clr-flt-nota">
          El motor es determinista: mismos criterios, mismo resultado, sin IA y sin coste por
          licitación. Lo que un filtro descarta queda registrado con su motivo — un criterio
          demasiado estrecho no produce falsos positivos, produce silencio, y el silencio es
          invisible si no se audita.{" "}
          <Link className="clr-flt-link" href="/auditoria">
            Ver qué se está descartando
          </Link>
        </p>
      </div>
    </main>
  );
}
