import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel: omit `output: "standalone"` — Vercel handles its own output.
  // Self-hosted deploys (Docker) should add it back.
  serverExternalPackages: ["ws"],
};

export default nextConfig;
