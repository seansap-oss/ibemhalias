import type { NextConfig } from "next";

const isStaticExport = process.env.BUILD_TARGET === "capacitor";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  serverExternalPackages: ["msedge-tts", "ws"],
  ...(isStaticExport
    ? {
        output: "export" as const,
        distDir: ".next-static",
        images: {
          unoptimized: true,
        },
        trailingSlash: true,
      }
    : {
        images: {
          remotePatterns: [
            {
              protocol: "https" as const,
              hostname: "images.unsplash.com",
            },
            {
              protocol: "https" as const,
              hostname: "**.supabase.co",
            },
            {
              protocol: "https" as const,
              hostname: "**.mux.com",
            },
          ],
        },
        headers: async () => [
          {
            source: "/(.*)",
            headers: [
              { key: "X-Content-Type-Options", value: "nosniff" },
              { key: "X-Frame-Options", value: "SAMEORIGIN" },
              { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
              { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
            ],
          },
          {
            source: "/sw.js",
            headers: [
              {
                key: "Cache-Control",
                value: "no-cache, no-store, must-revalidate",
              },
            ],
          },
        ],
      }),

  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
