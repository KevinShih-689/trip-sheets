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
};

export default nextConfig;
