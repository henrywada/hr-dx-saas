import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/adm/device-pairing",
        destination: "/device-pairing",
        permanent: true,
      },
      {
        source: "/approve_pc",
        destination: "/device-pairing",
        permanent: true,
      },
    ];
  },
  // Turbopack 既定の `next dev` でも .md を文字列として取り込む（webpack 設定との衝突も解消）
  turbopack: {
    rules: {
      "*.md": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
  webpack: (config) => {
    // マニュアル本文を .md から文字列としてバンドルする（--webpack ビルド用）
    config.module.rules.push({
      test: /\.md$/i,
      issuer: /\.[jt]sx?$/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
