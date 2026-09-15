import type { MetadataRoute } from "next";
import { appUrl } from "@/src/lib/app-url";

/**
 * El producto no tenía robots.txt. Se declara el sitemap y se cierran las rutas
 * que no deben indexarse: lo que exige sesión no tiene nada que ofrecer a un
 * buscador, y las páginas profundas de paginación compiten con la página 1 de
 * su propia faceta (esas además ya van con `robots: noindex` en su metadata).
 */
export default function robots(): MetadataRoute.Robots {
  const base = appUrl().replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/cuenta",
        "/perfil",
        "/mis-coincidencias",
        "/mis-filtros",
        "/auditoria",
        "/diagnostico/historial",
        "/asistente/",
        "/login",
        "/registro",
        "/reportes/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
