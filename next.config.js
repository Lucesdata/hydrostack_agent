/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit ships Adobe Font Metric (.afm) files that webpack cannot bundle.
  // Keeping it external lets it resolve its own assets from node_modules at runtime.
  experimental: {
    serverComponentsExternalPackages: ['pdfkit'],
  },
};

module.exports = nextConfig;
