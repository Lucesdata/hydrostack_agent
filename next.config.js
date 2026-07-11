/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit ships Adobe Font Metric (.afm) files that webpack cannot bundle.
  // Keeping it external lets it resolve its own assets from node_modules at runtime.
  // ws / @neondatabase/serverless: bundling ws breaks its internal frame-masking
  // ("t.mask is not a function") under the Vercel serverless runtime — external avoids it.
  experimental: {
    serverComponentsExternalPackages: ['pdfkit', 'ws', '@neondatabase/serverless'],
  },
};

module.exports = nextConfig;
