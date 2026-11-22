import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
