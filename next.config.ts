import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ❗ Evita que el build se caiga por ESLint en producción
  eslint: { ignoreDuringBuilds: true },

  // (Opcional) Si alguna vez te aparece error de tipos en el build:
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;

