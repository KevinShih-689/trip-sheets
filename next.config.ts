import type { NextConfig } from 'next';

// CI 於 build 前注入 BASE_PATH=/<repo-name>(見 .github/workflows/deploy.yml);
// 本機開發與 preview 為空字串。
const basePath = process.env.BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  experimental: {
    // Chakra v3 re-exports its whole component surface (and Zag.js under it) from
    // one barrel. Next's default optimizePackageImports list does not cover it, so a
    // Server Component importing `@chakra-ui/react` drags the entire barrel across
    // the RSC boundary into that route's client chunk. Rewriting barrel imports to
    // direct module paths keeps each route to the components it actually uses.
    optimizePackageImports: ['@chakra-ui/react'],
  },
};

export default nextConfig;
