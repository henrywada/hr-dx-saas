/**
 * LINE連携管理 — SaaS管理者ページ（Server Component）
 *
 * - getLineLinkStats() で全テナント横断の連携件数を取得
 * - 環境変数は boolean のみ作成して Client に渡す（シークレット値は渡さない）
 * - layout が developer / supaUser をガードするため、ロール分岐は不要
 */

import { getLineLinkStats } from '@/features/line/queries'
import SaasLineDashboard from '@/features/line/components/SaasLineDashboard'

export default async function SaasLinePage() {
  // 連携件数を取得
  const stats = await getLineLinkStats()

  // 環境変数の設定状況を boolean のみで渡す（シークレット値は絶対に渡さない）
  const envFlags = {
    hasChannelSecret: Boolean(process.env.LINE_CHANNEL_SECRET),
    hasChannelAccessToken: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
    hasLiffId: Boolean(process.env.NEXT_PUBLIC_LIFF_ID),
    // LINE Login チャネル ID（LIFF 連携 / ウェブログインフロー用）
    hasLoginChannelId: Boolean(process.env.LINE_LOGIN_CHANNEL_ID),
  }

  return <SaasLineDashboard stats={stats} envFlags={envFlags} />
}
