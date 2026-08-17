/**
 * デプロイ環境（ローカル / Preview / 本番）の判定。
 *
 * Vercel はビルド時に `VERCEL_ENV`（production / preview / development）と
 * `VERCEL_GIT_COMMIT_SHA` を自動で注入する。ローカル開発では未定義になるため、
 * `next.config.ts` の `env` で `NEXT_PUBLIC_DEPLOY_ENV` / `NEXT_PUBLIC_COMMIT_SHA`
 * にマッピングし、サーバー・クライアントの双方から同じ値を参照できるようにしている。
 *
 * フッターのバージョン番号（`/my_vup` で手動更新）は「何がリリースされたか」を表す。
 * 本モジュールが返す値は「いまどの環境を見ているか」を表すもので、役割が異なる。
 * 手動更新を伴わないため、版数の上げ忘れがあっても環境判別は常に正しい。
 */

export type DeployEnv = 'local' | 'preview' | 'production'

/** フッターのバッジに表示する短縮ラベル */
const DEPLOY_ENV_LABEL: Record<DeployEnv, string> = {
  local: 'local',
  preview: 'preview',
  production: 'prod',
}

/** バッジのドット色（ローカル=青 / Preview=黄 / 本番=緑） */
const DEPLOY_ENV_DOT_CLASS: Record<DeployEnv, string> = {
  local: 'bg-blue-500',
  preview: 'bg-amber-500',
  production: 'bg-green-500',
}

/**
 * 現在のデプロイ環境を返す。
 *
 * `vercel dev`（VERCEL_ENV = 'development'）は開発者の手元で動くため local 扱いとする。
 */
export function getDeployEnv(): DeployEnv {
  switch (process.env.NEXT_PUBLIC_DEPLOY_ENV) {
    case 'production':
      return 'production'
    case 'preview':
      return 'preview'
    default:
      return 'local'
  }
}

/** 現在がローカル環境かどうか（タブタイトルの `[LOCAL]` 付与等に使う） */
export function isLocalEnv(): boolean {
  return getDeployEnv() === 'local'
}

/**
 * デプロイされたコミットの短縮 SHA（先頭 7 桁）。
 *
 * ローカルではコミットが確定しないため null を返す。
 * バージョン番号と違いビルドごとに必ず変わるため、「本番に反映済みか」の判定に使える。
 */
export function getCommitSha(): string | null {
  const sha = process.env.NEXT_PUBLIC_COMMIT_SHA
  if (!sha || sha === 'dev') return null
  return sha.slice(0, 7)
}

/** バッジ表示用の値をまとめて返す */
export function getDeployBadge(): {
  env: DeployEnv
  label: string
  dotClass: string
  commitSha: string | null
} {
  const env = getDeployEnv()
  return {
    env,
    label: DEPLOY_ENV_LABEL[env],
    dotClass: DEPLOY_ENV_DOT_CLASS[env],
    commitSha: getCommitSha(),
  }
}
