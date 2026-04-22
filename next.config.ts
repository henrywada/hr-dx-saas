import type { NextConfig } from "next";

const vercelOrigin =
  process.env.VERCEL_URL != null && process.env.VERCEL_URL.length > 0
    ? `https://${process.env.VERCEL_URL}`
    : null;

const nextConfig: NextConfig = {
  // pdf-parse / pdfjs-dist を webpack が束ねると Node 上で Object.defineProperty 等が壊れるためサーバでは外部解決
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  // 人事ナレッジ取り込み・eラーニング動画アップロード等、Server Action の大きな FormData 用
  experimental: {
    // ミドルウェアがボディを複製するときの上限。既定 ~10MB だと大きめの multipart が途中で切れ
    // busboy が「Unexpected end of form」を出すことがあるため serverActions より少し大きくする
    proxyClientMaxBodySize: "55mb",
    serverActions: {
      bodySizeLimit: "50mb",
      // 本番カスタムドメイン・Vercel ホスト・ローカルで Server Action の Origin 検証を通す
      allowedOrigins: [
        "https://app.hr-dx.jp",
        ...(vercelOrigin ? [vercelOrigin] : []),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ],
    },
  },
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
      {
        source: "/adm/approval",
        destination: "/approval",
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
