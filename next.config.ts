import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Mantém o PDFKit como pacote externo na Vercel para evitar que o bundler
  // perca os arquivos internos de fonte AFM, como Helvetica.afm.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    // Somente a rota que realmente gera PDF precisa carregar as fontes e logos.
    // Aplicar o tracing a todas as APIs administrativas tornava o build lento e
    // aumentava desnecessariamente o pacote serverless.
    "/api/admin/reports": ["./node_modules/pdfkit/js/data/**/*", "./public/logo-brilho-do-sol-pdf.png", "./public/logo-brilho-do-sol.jpeg"],
  },
};

export default nextConfig;
