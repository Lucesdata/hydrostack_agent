/**
 * Reporte permanente (SDD §9, Fase 6).
 *
 * El contenido NO se recalcula: se lee tal cual quedó congelado en
 * `al_reportes.payload`. Eso es lo que permite que el enlace de un correo abierto
 * tres semanas después siga diciendo lo mismo que decía el correo.
 *
 * **La frontera de visibilidad es dura.** Un reporte privado exige sesión Y que
 * el `account_id` coincida; un slug filtrado no basta. Y se responde 404, no 403:
 * decir "existe pero no puedes verlo" ya filtra que existe.
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/src/lib/db/client";
import { alReportes } from "@/src/lib/db/schema/aqualicita";
import { getSessionUser } from "@/src/lib/supabase/get-session-user";
import { cuentaDe } from "@/src/lib/al/cuenta";
import { registrarVisita } from "@/src/lib/al/reportes/generar";
import { ReporteDigest, type PayloadDigest } from "./ReporteDigest";
import { ReporteMercado, type PayloadMercado } from "./ReporteMercado";
import { STYLE } from "./estilos";

export const dynamic = "force-dynamic";

async function cargar(slug: string) {
  const [row] = await db.select().from(alReportes).where(eq(alReportes.slug, slug)).limit(1);
  if (!row) return null;

  if (row.visibilidad === "publico") return row;

  const user = await getSessionUser();
  if (!user) return null;
  if (row.accountId !== cuentaDe(user)) return null;
  return row;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [row] = await db
    .select({ titulo: alReportes.titulo, visibilidad: alReportes.visibilidad })
    .from(alReportes)
    .where(eq(alReportes.slug, slug))
    .limit(1);

  if (!row) return { title: "Reporte no encontrado" };
  return {
    title: `${row.titulo} · AquaLicita`,
    // Un reporte de cuenta no se indexa aunque alguien publique el enlace.
    robots: row.visibilidad === "publico" ? undefined : { index: false, follow: false },
  };
}

export default async function ReportePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const reporte = await cargar(slug);
  if (!reporte) notFound();

  await registrarVisita(slug);

  return (
    <main className="clr-rep">
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="clr-rep-inner">
      <header>
        <p className="clr-rep-kicker">
          {reporte.visibilidad === "publico" ? "Reporte público" : "Tu reporte"}
        </p>
        <h1 className="clr-rep-title">{reporte.titulo}</h1>
        <p className="clr-rep-sub">
          Generado el{" "}
          {new Date(reporte.generadoEn).toLocaleDateString("es-CO", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          . Este reporte es permanente: refleja lo que había ese día.
        </p>
      </header>

      {reporte.tipo === "digest_diario" ? (
        <ReporteDigest payload={reporte.payload as PayloadDigest} />
      ) : reporte.tipo === "mercado_departamento" ? (
        <ReporteMercado payload={reporte.payload as PayloadMercado} />
      ) : (
        // `competidor` y `entidad` todavía no tienen render propio. El volcado
        // es honesto —no inventa una presentación que nadie diseñó— y solo se
        // alcanza desde un slug que aún no se genera en ningún flujo.
        <pre className="clr-rep-json">{JSON.stringify(reporte.payload, null, 2)}</pre>
      )}
      </div>
    </main>
  );
}
