/**
 * ¿Esta URL lleva al detalle de un proceso en SECOP II?
 *
 * `proceso.url` a veces guarda la página de login de la comunidad
 * (`.../STS/Users/Login/Index`, medido en 2 de los 5 mayores adjudicados de
 * octubre de 2026): un botón «Ver SECOP II» que cae ahí engaña. Solo se acepta
 * https en `community.secop.gov.co` con el detalle de la oportunidad (`noticeUID`).
 */
export function urlDetalleSecop(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    if (u.hostname !== "community.secop.gov.co") return null;
    if (!/\/OpportunityDetail\//i.test(u.pathname)) return null;
    return /^CO1\.NTC\.\d+$/i.test(u.searchParams.get("noticeUID") ?? "") ? u.toString() : null;
  } catch {
    return null;
  }
}
