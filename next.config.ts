import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // La herramienta de búsqueda vivía en la portada; ahora está en /cerca.
  async redirects() {
    return [{ source: "/", has: [{ type: "query", key: "ciudad" }], destination: "/cerca", permanent: true }];
  },
  // El histórico por estación se lee del disco en tiempo de ejecución (lib/station-history.ts).
  outputFileTracingIncludes: {
    "/api/history": ["./datos/rolling/*.json"],
    "/api/station-history": ["./datos/rolling/*.json"],
  },
};

export default nextConfig;
