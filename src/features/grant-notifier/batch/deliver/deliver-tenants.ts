import type { SupabaseClient } from '@supabase/supabase-js'
import { APP_ROUTES } from '@/config/routes'
import { sendMail } from '@/lib/mail/send'
import { loadTenantConditions } from '@/features/grant-notifier/batch/match/match-repository'
import {
  assembleDeliverables,
  hasDeliveredThisMonth,
  loadDeliveredGrantIds,
  loadGrantsByIds,
  loadMatchedGrants,
  recordDeliveries,
} from '@/features/grant-notifier/batch/deliver/deliver-repository'
import { buildDigest } from '@/features/grant-notifier/batch/deliver/digest'
import { shouldDeliverForFrequency } from '@/features/grant-notifier/batch/deliver/frequency'
import { createUnsubscribeToken } from '@/features/grant-notifier/unsubscribe-token'

/**
 * 配信オーケストレーション。
 * テナントごとに未配信の適合／要確認助成金を詳細ダイジェストにまとめ、
 * 頻度判定を通れば通知先メールへ送信し、grant_deliveries に記録する。
 * 対象0件のテナントには送らない。
 */

export interface DeliverDeps {
  serviceClient: SupabaseClient
  /** アプリのベースURL（配信停止・条件設定・アーカイブのリンク生成） */
  appBaseUrl: string
  /** 配信停止トークンの署名鍵 */
  unsubscribeSecret: string
  nowIso?: string
}

export interface DeliverSummary {
  tenantsDelivered: number
  mailsSent: number
  grantsDelivered: number
  skipped: number
  failed: number
}

/** 当月の開始時刻（UTC基準）。月次頻度の判定に使う */
function monthStartIso(nowIso?: string): string {
  const now = nowIso ? new Date(nowIso) : new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

/**
 * 条件設定済みの全テナントへ配信する。
 * 戻り値は処理件数の内訳（grant_batch_runs／ログ用）。
 */
export async function deliverTenants(deps: DeliverDeps): Promise<DeliverSummary> {
  const conditions = await loadTenantConditions(deps.serviceClient)
  const monthStart = monthStartIso(deps.nowIso)
  const conditionsUrl = `${deps.appBaseUrl}${APP_ROUTES.TENANT.ADMIN_GRANT_NOTIFIER_CONDITIONS}`
  const archiveUrl = `${deps.appBaseUrl}${APP_ROUTES.TENANT.ADMIN_GRANT_NOTIFIER_ARCHIVE}`

  const summary: DeliverSummary = {
    tenantsDelivered: 0,
    mailsSent: 0,
    grantsDelivered: 0,
    skipped: 0,
    failed: 0,
  }

  for (const condition of conditions) {
    try {
      if (condition.notifyEmails.length === 0) {
        summary.skipped += 1
        continue
      }

      const matched = await loadMatchedGrants(deps.serviceClient, condition.tenantId)
      const delivered = await loadDeliveredGrantIds(deps.serviceClient, condition.tenantId)
      const pending = matched.filter(m => !delivered.has(m.grantId))

      // 新着0件の週は送らない
      if (pending.length === 0) {
        summary.skipped += 1
        continue
      }

      // 月次は当月未配信のときだけ送る
      const deliveredThisMonth = await hasDeliveredThisMonth(
        deps.serviceClient,
        condition.tenantId,
        monthStart
      )
      if (!shouldDeliverForFrequency(condition.deliveryFrequency, deliveredThisMonth)) {
        summary.skipped += 1
        continue
      }

      const grantsById = await loadGrantsByIds(
        deps.serviceClient,
        pending.map(m => m.grantId)
      )
      const deliverables = assembleDeliverables(pending, grantsById)
      if (deliverables.length === 0) {
        summary.skipped += 1
        continue
      }

      // 受信者ごとに専用の配信停止リンクを付けて送る
      for (const address of condition.notifyEmails) {
        const token = createUnsubscribeToken(condition.tenantId, address, deps.unsubscribeSecret)
        const unsubscribeUrl = `${deps.appBaseUrl}${APP_ROUTES.PUBLIC.GRANT_NOTIFIER_UNSUBSCRIBE}?token=${token}`
        const digest = buildDigest({
          grants: deliverables,
          unsubscribeUrl,
          conditionsUrl,
          archiveUrl,
        })

        await sendMail({
          to: address,
          subject: digest.subject,
          html: digest.html,
        })
        summary.mailsSent += 1
      }

      // 同じ送信バッチの行が同一 sent_at を持つよう、時刻を明示して記録する
      // （配信アーカイブは sent_at の一致で1通のメールを判別する）
      await recordDeliveries(
        deps.serviceClient,
        condition.tenantId,
        deliverables.map(d => d.grantId),
        condition.notifyEmails.length,
        new Date().toISOString()
      )
      summary.tenantsDelivered += 1
      summary.grantsDelivered += deliverables.length
    } catch (error) {
      console.error(`[grant-notifier] 配信に失敗しました (tenant=${condition.tenantId}):`, error)
      summary.failed += 1
    }
  }

  return summary
}
