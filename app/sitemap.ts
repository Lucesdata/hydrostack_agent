import type { MetadataRoute } from "next";
import { appUrl } from "@/src/lib/app-url";
import { todasLasFacetas } from "@/src/lib/secop/facetas";
import { slugsRecientes } from "@/src/lib/secop/ficha";

/**
 * Sitemap dinámico: las páginas fijas, las 43 rutas facetadas y las fichas de
 * los procesos abiertos más recientes.
 *
 * El producto no tenía ninguno, y sin sitemap las fichas —que son la única
 * superficie de entrada orgánica— dependen de que un buscador las descubra
 * siguiendo enlaces desde la portada.
 *
 * ── El tope de 2.000 fichas ─────────────────────────────────────────────────
 * Hay 35.222 procesos abiertos. Listarlos todos daría un sitemap de varios MB
 * que hay que generar en cada revalidación, y la mayoría son procesos viejos
 * que nadie va a buscar. Se listan los 2.000 más recientes: son los que tienen
 * posibilidad real de recibir una visita, y el archivo se queda en un tamaño
 * que Google acepta de una pieza (el límite son 50.000 URL / 50 MB).
 *
 * Revalida cada 6 horas. Con la ingesta diaria, un proceso nuevo entra al
 * sitemap el mismo día.
 */
export const revalidate = 21600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl().replace(/\/$/, "");
  const ahora = new Date();

  const fijas = [
    "",
    "/licitaciones",
    "/diagnostico",
    "/pliego",
    "/soluciones",
    "/nosotros",
    "/precios",
  ].map((ruta) => ({
    url: `${base}${ruta}`,
    lastModified: ahora,
    changeFrequency: "weekly" as const,
    priority: ruta === "" ? 1 : 0.7,
  }));

  // Si la base no responde, el sitemap sale con las páginas fijas en vez de
  // romper la ruta entera: media superficie indexable es mejor que un 500.
  let facetas: MetadataRoute.Sitemap = [];
  let fichas: MetadataRoute.Sitemap = [];
  try {
    facetas = (await todasLasFacetas()).map((f) => ({
      url: `${base}/licitaciones/${f.familia}/${f.slug}`,
      lastModified: ahora,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
    fichas = (await slugsRecientes(2000)).map((f) => ({
      url: `${base}/licitaciones/${f.slug}`,
      lastModified: f.fecha ? new Date(f.fecha) : ahora,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    /* se queda con las fijas */
  }

  return [...fijas, ...facetas, ...fichas];
}
