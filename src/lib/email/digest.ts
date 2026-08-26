/**
 * Plantilla del correo de coincidencias (Fase 1.3). Template literal simple —
 * sin react-email: una sola plantilla no justifica la dependencia (se revisa
 * si crecen a >3 plantillas, mismo criterio que docs/plan-arquitectura-roadmap.md §3.3).
 * Reusa las mismas utilidades de formato que `/mis-coincidencias`
 * (src/components/secop/format.ts) para que el correo y la página digan lo mismo.
 */

import type { Match } from "@/src/lib/matching/match";
import { sentenceCaseTitle, formatCopCompact, verdictScore } from "@/src/components/secop/format";
import { signUnsubscribeToken } from "./unsubscribe-token";

export interface Digest {
  subject: string;
  html: string;
  text: string;
  /** También va en el header `List-Unsubscribe` — send.ts la reusa de aquí. */
  unsubscribeUrl: string;
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/** UTM de campaña — el destino real de cada ítem sigue siendo la URL de SECOP. */
function withUtm(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}utm_source=aqualicita&utm_medium=email&utm_campaign=digest`;
}

export function renderDigest(matches: Match[], usuario: { id: string; email: string }): Digest {
  const subject =
    matches.length === 1
      ? "1 licitación de agua y saneamiento que te conviene"
      : `${matches.length} licitaciones de agua y saneamiento que te convienen`;

  const unsubscribeUrl = `${appUrl()}/api/alertas/unsubscribe?token=${signUnsubscribeToken(usuario.id)}`;

  const filas = matches.map(({ proceso, verdict }) => {
    const score = verdictScore(verdict);
    const titulo = sentenceCaseTitle(proceso.nombre || proceso.referencia);
    const valor = formatCopCompact(proceso.valorAdjudicacion ?? proceso.precioBase);
    const link = proceso.url ? withUtm(proceso.url) : null;
    return { titulo, entidad: proceso.entidad, valor, score, link };
  });

  const html = [
    '<div style="font-family:system-ui,sans-serif;color:#0A1F1C;max-width:560px;margin:0 auto;">',
    `<p>Estos procesos abiertos del sector agua calzan con tu perfil en AquaLicita:</p>`,
    "<div>",
    ...filas.map(
      (f) => `
      <div style="border:1px solid #E5E5E0;border-radius:8px;padding:14px 16px;margin-bottom:10px;">
        <p style="margin:0 0 4px;font-weight:600;font-size:14px;">${f.titulo}</p>
        <p style="margin:0 0 8px;font-size:12px;color:#525B5A;">${f.entidad} · ${f.score.pass}/${f.score.total}</p>
        <p style="margin:0;font-size:13px;">
          ${f.valor}
          ${f.link ? ` · <a href="${f.link}" style="color:#0369A1;">Ver en SECOP</a>` : ""}
        </p>
      </div>`
    ),
    "</div>",
    `<p style="margin-top:24px;font-size:11px;color:#8A938F;">` +
      `Recibes esto porque tienes un perfil de oferente en AquaLicita. ` +
      `<a href="${unsubscribeUrl}" style="color:#8A938F;">Darme de baja de estas alertas</a>.</p>`,
    "</div>",
  ].join("\n");

  const text = [
    "Estos procesos abiertos del sector agua calzan con tu perfil en AquaLicita:",
    "",
    ...filas.map(
      (f) =>
        `- ${f.titulo} (${f.entidad}, ${f.score.pass}/${f.score.total}) — ${f.valor}` +
        (f.link ? ` — ${f.link}` : "")
    ),
    "",
    `Darte de baja: ${unsubscribeUrl}`,
  ].join("\n");

  return { subject, html, text, unsubscribeUrl };
}
