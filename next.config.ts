import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reduz bundle de libs com muitos exports (lucide-react, date-fns, etc.)
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
  },
};

export default nextConfig;
