import type { NextConfig } from "next";

/**
 * Two build modes:
 *  - `next dev` / `next build` → normal server build. Dev route handlers
 *    proxy API calls to the live CF-Server-Monitor instance.
 *  - `BUILD_EXPORT=true next build` → static SPA export into `out/`. The
 *    packaging script removes app/api first; in production the theme is
 *    served by CF-Server-Monitor, so API calls are same-origin.
 */
const isExport = process.env.BUILD_EXPORT === "true";

const nextConfig: NextConfig = {
  output: isExport ? "export" : undefined,
  assetPrefix: isExport ? "." : undefined,
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
