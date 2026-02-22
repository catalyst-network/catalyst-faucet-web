import type { NextConfig } from "next";

const turbopackRoot = new URL(".", import.meta.url).pathname;

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  turbopack: {
    root: turbopackRoot,
  },
};

export default nextConfig;
