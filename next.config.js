/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit ships Adobe Font Metric (.afm) files that webpack cannot bundle.
  // Keeping it external lets it resolve its own assets from node_modules at runtime.
  // ws / @neondatabase/serverless: bundling ws breaks its internal frame-masking
  // ("t.mask is not a function") under the Vercel serverless runtime — external avoids it.
  experimental: {
    serverComponentsExternalPackages: ["pdfkit", "ws", "@neondatabase/serverless"],
    // Default Server Actions body limit is 1MB — too small for a real pliego PDF
    // upload (uploadPliegoAction in src/lib/secop/pliego-actions.ts). Match the
    // 20MB ceiling that MAX_BYTES_PDF (src/lib/pliego/validate.ts) already enforces
    // in application code, so that check isn't dead code for 1MB-20MB files.
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  // El repo no tenía .eslintrc.json antes de 2026-07-13; `next build` corría sin
  // linter (no había config que activarlo). Agregar la config para que
  // `npm run lint` funcione en modo no interactivo activó el lint como gate
  // dentro de `next build`, lo que rompe el build por errores preexistentes en
  // archivos no relacionados con este trabajo. Se desactiva el lint-gate del
  // build para preservar el comportamiento previo; `npm run lint` sigue intacto.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Páginas retiradas el 2026-09-27 (plan «la ficha como centro»,
  // docs/superpowers/plans/2026-09-27-ficha-como-centro.md). 308 (permanente) a su sitio
  // más cercano para que un enlace viejo nunca dé 404.
  async redirects() {
    return [
      { source: "/asistente/:path*", destination: "/", permanent: true },
      { source: "/reportes/:path*", destination: "/", permanent: true },
      { source: "/nosotros", destination: "/", permanent: true },
      { source: "/soluciones", destination: "/licitaciones", permanent: true },
      { source: "/auditoria", destination: "/mis-filtros", permanent: true },
      // PR 2: el pliego se sube y se lee en la §4 de cada ficha.
      { source: "/pliego", destination: "/licitaciones", permanent: true },
      // PR 3: cada rival se abre en la §7 de la ficha; quién compra sigue aparte.
      { source: "/competidores", destination: "/licitaciones/entidades", permanent: true },
      { source: "/competidores/:key*", destination: "/licitaciones/entidades", permanent: true },
      // 2026-10-04: «Explorar» y «Descubrir» se funden en la vitrina, que ahora
      // busca y filtra (docs/superpowers/plans/2026-10-04-vitrina-radar.md). La
      // query pasa tal cual, así que `/licitaciones/explorar?q=…` sigue buscando.
      { source: "/licitaciones/explorar", destination: "/licitaciones", permanent: true },
      { source: "/licitaciones/descubrir", destination: "/licitaciones", permanent: true },
    ];
  },
};

module.exports = nextConfig;
