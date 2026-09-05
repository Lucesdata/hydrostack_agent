/**
 * Plantilla del correo diario agregado (SDD §7.1, Fase 6).
 *
 * **Un solo correo por cuenta y día**, con todo dentro. Tres filtros con novedad
 * no son tres correos: son tres secciones. Mandar uno por filtro es la vía más
 * rápida a que el usuario ponga una regla de "mover a archivados".
 *
 * Orden fijado por el SDD, y no es estético:
 *   1. **Adendas con su diff** — un cambio en un pliego que ya estás evaluando es
 *      lo más urgente que te puede pasar, y "hubo una adenda" sin decir qué
 *      cambió no sirve de nada.
 *   2. **Adjudicaciones** — quién ganó y a qué precio.
 *   3. **Aperturas** — lo nuevo que casó con tus filtros.
 *   4. Enlace al reporte permanente y baja de un clic.
 *
 * Reusa las utilidades de formato de `/mis-coincidencias` para que el correo y
 * la página digan lo mismo, igual que hace `email/digest.ts`.
 */

import { sentenceCaseTitle, formatCopCompact } from "@/src/components/secop/format";
import { signUnsubscribeToken } from "@/src/lib/email/unsubscribe-token";
import type { Digest } from "@/src/lib/email/digest";
import type { Match } from "@/src/lib/matching/match";
import type { Novedades, NovedadEvento, NovedadApertura } from "./recopilar";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function withUtm(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}utm_source=aqualicita&utm_medium=email&utm_campaign=digest`;
}

/**
 * Las cuantías llegan de Postgres como texto (`numeric::text`), pero
 * `formatCopCompact` espera número — el mismo contrato que ya usa
 * `/mis-coincidencias`. Un valor no numérico se trata como ausente, no como 0:
 * "$0 M" afirmaría un precio que nadie publicó.
 */
function cop(v: string | null): string {
  if (v === null) return formatCopCompact(null);
  const n = Number(v);
  return formatCopCompact(Number.isFinite(n) ? n : null);
}

function esc(s: string | null): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const CARD =
  "border:1px solid #E5E5E0;border-radius:8px;padding:14px 16px;margin-bottom:10px;";
const H2 = "margin:24px 0 10px;font-size:15px;font-weight:600;color:#0A1F1C;";

function titulo(n: { titulo: string | null; secopProcesoId: string }): string {
  return sentenceCaseTitle(n.titulo || n.secopProcesoId);
}

/** El diff, que es lo que convierte una adenda en información. */
function tablaDelta(n: NovedadEvento): string {
  if (!n.delta || n.delta.length === 0) return "";
  const filas = n.delta
    .map((d) => {
      const antes = d.antes === null ? "—" : esc(d.antes);
      const despues = d.despues === null ? "—" : esc(d.despues);
      const valores =
        d.antes === null && d.despues === null
          ? '<em style="color:#8A938F;">cambió</em>'
          : `<span style="color:#8A938F;text-decoration:line-through;">${antes}</span> → <strong>${despues}</strong>`;
      return `<tr><td style="padding:2px 8px 2px 0;color:#525B5A;">${esc(d.etiqueta)}</td><td style="padding:2px 0;">${valores}</td></tr>`;
    })
    .join("");
  return `<table style="font-size:12px;border-collapse:collapse;margin-top:6px;">${filas}</table>`;
}

function tarjetaEvento(n: NovedadEvento, mostrarDelta: boolean): string {
  const link = n.url ? withUtm(n.url) : null;
  return `
    <div style="${CARD}">
      <p style="margin:0 0 4px;font-weight:600;font-size:14px;">${esc(titulo(n))}</p>
      <p style="margin:0 0 6px;font-size:12px;color:#525B5A;">${esc(n.entidad)} · ${cop(n.valorNuevo ?? n.valorEstimado)}</p>
      ${mostrarDelta ? tablaDelta(n) : ""}
      ${link ? `<p style="margin:8px 0 0;font-size:13px;"><a href="${link}" style="color:#0369A1;">Ver en SECOP</a></p>` : ""}
    </div>`;
}

function tarjetaApertura(n: NovedadApertura): string {
  const link = n.url ? withUtm(n.url) : null;
  return `
    <div style="${CARD}">
      <p style="margin:0 0 4px;font-weight:600;font-size:14px;">${esc(sentenceCaseTitle(n.titulo || n.secopProcesoId))}</p>
      <p style="margin:0 0 6px;font-size:12px;color:#525B5A;">${esc(n.entidad)} · ${cop(n.valorEstimado)}${n.filtroNombre ? ` · filtro “${esc(n.filtroNombre)}”` : ""}</p>
      ${link ? `<p style="margin:0;font-size:13px;"><a href="${link}" style="color:#0369A1;">Ver en SECOP</a></p>` : ""}
    </div>`;
}

/** Coincidencias del perfil de oferente: la sección que ya existía, integrada. */
function tarjetaMatch(m: Match): string {
  const link = m.proceso.url ? withUtm(m.proceso.url) : null;
  return `
    <div style="${CARD}">
      <p style="margin:0 0 4px;font-weight:600;font-size:14px;">${esc(sentenceCaseTitle(m.proceso.nombre || m.proceso.referencia))}</p>
      <p style="margin:0 0 6px;font-size:12px;color:#525B5A;">${esc(m.proceso.entidad)} · ${formatCopCompact(m.proceso.valorAdjudicacion ?? m.proceso.precioBase)}</p>
      ${link ? `<p style="margin:0;font-size:13px;"><a href="${link}" style="color:#0369A1;">Ver en SECOP</a></p>` : ""}
    </div>`;
}

function asunto(n: Novedades, matches: number): string {
  const partes: string[] = [];
  if (n.adendas.length) partes.push(`${n.adendas.length} adenda${n.adendas.length > 1 ? "s" : ""}`);
  if (n.adjudicaciones.length) partes.push(`${n.adjudicaciones.length} adjudicada${n.adjudicaciones.length > 1 ? "s" : ""}`);
  if (n.aperturas.length) partes.push(`${n.aperturas.length} nueva${n.aperturas.length > 1 ? "s" : ""}`);
  if (partes.length === 0 && matches > 0) {
    return matches === 1
      ? "1 licitación de agua y saneamiento que te conviene"
      : `${matches} licitaciones de agua y saneamiento que te convienen`;
  }
  // El asunto dice QUÉ hay, no cuántas cosas hay: "3 adendas" se abre, "3
  // novedades" no.
  return partes.length ? `AquaLicita: ${partes.join(", ")}` : "AquaLicita";
}

export function renderDigestAgregado(
  novedades: Novedades,
  usuario: { id: string; email: string },
  reporteUrl: string | null,
  matchesPerfil: Match[] = []
): Digest {
  const unsubscribeUrl = `${appUrl()}/api/alertas/unsubscribe?token=${signUnsubscribeToken(usuario.id)}`;

  const secciones: string[] = [];
  const lineas: string[] = [];

  if (novedades.adendas.length) {
    secciones.push(`<h2 style="${H2}">Cambios en procesos que sigues</h2>`);
    secciones.push(...novedades.adendas.map((n) => tarjetaEvento(n, true)));
    lineas.push("CAMBIOS EN PROCESOS QUE SIGUES");
    for (const n of novedades.adendas) {
      lineas.push(`- ${titulo(n)} (${n.entidad ?? "—"})`);
      for (const d of n.delta ?? []) {
        lineas.push(`    ${d.etiqueta}: ${d.antes ?? "—"} → ${d.despues ?? "—"}`);
      }
    }
    lineas.push("");
  }

  if (novedades.adjudicaciones.length) {
    secciones.push(`<h2 style="${H2}">Adjudicadas</h2>`);
    secciones.push(...novedades.adjudicaciones.map((n) => tarjetaEvento(n, true)));
    lineas.push("ADJUDICADAS");
    lineas.push(
      ...novedades.adjudicaciones.map((n) => `- ${titulo(n)} (${n.entidad ?? "—"})`)
    );
    lineas.push("");
  }

  if (novedades.aperturas.length) {
    secciones.push(`<h2 style="${H2}">Nuevas que casan con tus filtros</h2>`);
    secciones.push(...novedades.aperturas.map(tarjetaApertura));
    lineas.push("NUEVAS QUE CASAN CON TUS FILTROS");
    lineas.push(
      ...novedades.aperturas.map(
        (n) => `- ${sentenceCaseTitle(n.titulo || n.secopProcesoId)} (${n.entidad ?? "—"})`
      )
    );
    lineas.push("");
  }

  if (matchesPerfil.length) {
    secciones.push(`<h2 style="${H2}">Coincidencias con tu perfil</h2>`);
    secciones.push(...matchesPerfil.map(tarjetaMatch));
    lineas.push("COINCIDENCIAS CON TU PERFIL");
    lineas.push(
      ...matchesPerfil.map(
        (m) => `- ${sentenceCaseTitle(m.proceso.nombre || m.proceso.referencia)} (${m.proceso.entidad})`
      )
    );
    lineas.push("");
  }

  const pie = reporteUrl
    ? `<p style="margin-top:20px;font-size:13px;"><a href="${reporteUrl}" style="color:#0369A1;">Ver el reporte completo del día</a></p>`
    : "";

  const html = [
    '<div style="font-family:system-ui,sans-serif;color:#0A1F1C;max-width:560px;margin:0 auto;">',
    ...secciones,
    pie,
    `<p style="margin-top:24px;font-size:11px;color:#8A938F;">Recibes esto porque tienes filtros activos en AquaLicita. <a href="${unsubscribeUrl}" style="color:#8A938F;">Darme de baja</a>.</p>`,
    "</div>",
  ].join("\n");

  const text = [
    ...lineas,
    ...(reporteUrl ? [`Reporte completo: ${reporteUrl}`, ""] : []),
    `Darte de baja: ${unsubscribeUrl}`,
  ].join("\n");

  return { subject: asunto(novedades, matchesPerfil.length), html, text, unsubscribeUrl };
}
