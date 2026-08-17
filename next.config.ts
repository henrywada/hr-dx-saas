import type { NextConfig } from 'next'
import { execSync } from 'node:child_process'
import { STATIC_SECURITY_HEADERS } from './src/lib/security/static-headers'

const vercelOrigin =
  process.env.VERCEL_URL != null && process.env.VERCEL_URL.length > 0
    ? `https://${process.env.VERCEL_URL}`
    : null

/**
 * ローカル開発時のコミット SHA を git から取得する。
 *
 * Vercel では `VERCEL_GIT_COMMIT_SHA` が自動注入されるが、ローカルには存在しない。
 * 手元のコードが本番に出ているコミットと同一かをフッター上で突き合わせられるよう、
 * ローカルでは git の HEAD を読む。
 *
 * 未コミットの変更がある場合は末尾に `*` を付け、「本番と同じコミットだが手元に
 * 差分がある」状態を区別できるようにする。git が使えない環境では 'dev' を返す。
 *
 * 注意：この値は next.config.ts の評価時（＝dev server 起動時 / ビルド時）に確定する。
 * 起動したまま commit しても表示は更新されないため、正確に見たいときは再起動する。
 */
function resolveLocalCommitSha(): string {
  const run = (cmd: string) =>
    execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()

  try {
    const sha = run('git rev-parse --short=7 HEAD')
    const isDirty = run('git status --porcelain').length > 0
    return isDirty ? `${sha}*` : sha
  } catch {
    return 'dev'
  }
}

const nextConfig: NextConfig = {
  // pdf-parse / pdfjs-dist を webpack が束ねると Node 上で Object.defineProperty 等が壊れるためサーバでは外部解決
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas'],
  // デプロイ環境の判別用。Vercel が自動注入する VERCEL_ENV / VERCEL_GIT_COMMIT_SHA を
  // ビルド時にクライアントへ露出させる。ローカルでは VERCEL_* が無いため 'local' と
  // git の HEAD（未コミット変更があれば末尾に '*'）を埋め込み、本番フッターの SHA と
  // 突き合わせられるようにする。参照は src/lib/env/deploy-env.ts 経由で行う。
  env: {
    NEXT_PUBLIC_DEPLOY_ENV: process.env.VERCEL_ENV ?? 'local',
    NEXT_PUBLIC_COMMIT_SHA:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? resolveLocalCommitSha(),
  },
  // 人事ナレッジ取り込み・eラーニング動画アップロード等、Server Action の大きな FormData 用
  experimental: {
    // ミドルウェアがボディを複製するときの上限。既定 ~10MB だと大きめの multipart が途中で切れ
    // busboy が「Unexpected end of form」を出すことがあるため serverActions より少し大きくする
    proxyClientMaxBodySize: '55mb',
    serverActions: {
      bodySizeLimit: '50mb',
      // 本番カスタムドメイン・Vercel ホスト・ローカルで Server Action の Origin 検証を通す
      allowedOrigins: [
        'https://app.hr-dx.jp',
        ...(vercelOrigin ? [vercelOrigin] : []),
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ],
    },
  },
  // system-master の「タイトル・説明の自動作成」が route_path から page.tsx の
  // ソースを実行時に読むため、サーバーレス関数バンドルに全 page.tsx を明示的に含める
  outputFileTracingIncludes: {
    '/saas_adm/system-master/**': ['./src/app/**/page.tsx'],
  },
  // 静的セキュリティヘッダーを全ルート（_next/static 等の静的アセットを含む）へ適用する。
  // CSP は Supabase の URL 等をリクエスト時に解決するため src/middleware.ts 側で付与する
  // （middleware が短絡するリダイレクト・401 応答にはこの headers() が効かないため、
  //   middleware 側でも同じ静的ヘッダーを set している）。
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [...STATIC_SECURITY_HEADERS],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/adm/device-pairing',
        destination: '/device-pairing',
        permanent: true,
      },
      {
        source: '/approve_pc',
        destination: '/device-pairing',
        permanent: true,
      },
      {
        source: '/adm/approval',
        destination: '/approval',
        permanent: true,
      },
    ]
  },
  // Turbopack 既定の `next dev` でも .md を文字列として取り込む（webpack 設定との衝突も解消）
  turbopack: {
    rules: {
      '*.md': {
        loaders: ['raw-loader'],
        as: '*.js',
      },
    },
  },
  webpack: config => {
    // マニュアル本文を .md から文字列としてバンドルする（--webpack ビルド用）
    config.module.rules.push({
      test: /\.md$/i,
      issuer: /\.[jt]sx?$/,
      type: 'asset/source',
    })
    return config
  },
}

export default nextConfig
