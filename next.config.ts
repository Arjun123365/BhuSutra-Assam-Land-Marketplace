import type { NextConfig } from "next";

if (process.env.VERCEL && process.env.BHUSUTRA_PUBLIC_DEMO !== "1") {
  throw new Error("Vercel requires BHUSUTRA_PUBLIC_DEMO=1. Local database workflows must not be deployed.");
}

const nextConfig: NextConfig = {
  // Separate route entry points: local server actions are absent from public builds.
  pageExtensions: process.env.BHUSUTRA_PUBLIC_DEMO === "1" ? ["demo.tsx"] : ["tsx", "ts", "jsx", "js"],
  typescript: { tsconfigPath: process.env.BHUSUTRA_PUBLIC_DEMO === "1" ? "tsconfig.public.json" : "tsconfig.json" },
  outputFileTracingExcludes: { "/*": ["./.bhusutra-demo/**", "./.env*", "./**/*.sqlite*", "./**/*.session-key*", "./output/**", "./tmp/**"] },
  experimental: { serverActions: { bodySizeLimit: "256kb" } },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "same-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
      ],
    }, ...[
      "/verify-records/report/:parcelId",
      "/buyer/transactions/:reference/report",
      "/seller/transactions/:reference/report",
      "/admin/transactions/report",
    ].map(source => ({
      source,
      headers: [{ key: "Content-Security-Policy", value: "default-src 'none'; style-src 'unsafe-inline'; sandbox" }],
    }))];
  },
  async redirects() {
    return [
      {
        // Recover dashboard links copied with two trailing Markdown bold markers.
        source: "/seller/dashboard:formatting((?:\\*|%2A){2})",
        destination: "/seller/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
