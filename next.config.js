/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit ships Adobe Font Metric (.afm) files that webpack cannot bundle.
  // Keeping it external lets it resolve its own assets from node_modules at runtime.
  // ws / @neondatabase/serverless: bundling ws breaks its internal frame-masking
  // ("t.mask is not a function") under the Vercel serverless runtime — external avoids it.
  experimental: {
    serverComponentsExternalPackages: ['pdfkit', 'ws', '@neondatabase/serverless'],
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
};

module.exports = nextConfig;
