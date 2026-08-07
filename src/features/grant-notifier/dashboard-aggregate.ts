/**
 * /saas_adm/grant-notifier（バッチ運用監視）の集計ロジック。純粋関数のみ。
 * ページ側が既存テーブルの行を渡し、ここで表示用のビューを組み立てる
 * （集計専用テーブルは作らない）。
 */

// ---------------------------------------------------------------------------
// 全テナント稼働状況
// ---------------------------------------------------------------------------

export interface TenantOpsInput {
  tenants: { id: string; name: string | null }[]
  conditions: { tenant_id: string; delivery_frequency: string }[]
  deliveries: { tenant_id: string; sent_at: string }[]
  matchResults: { tenant_id: string; verdict: string }[]
}

export interface TenantOpsRow {
  tenantId: string
  name: string
  hasConditions: boolean
  deliveryFrequency: string | null
  lastDeliveryAt: string | null
  /** 適合の件数 */
  fitCount: number
  /** 要確認の件数 */
  reviewCount: number
}

export function buildTenantOps(input: TenantOpsInput): TenantOpsRow[] {
  const condByTenant = new Map(input.conditions.map(c => [c.tenant_id, c]))

  const lastDelivery = new Map<string, string>()
  for (const d of input.deliveries) {
    const prev = lastDelivery.get(d.tenant_id)
    if (!prev || d.sent_at > prev) lastDelivery.set(d.tenant_id, d.sent_at)
  }

  const fit = new Map<string, number>()
  const review = new Map<string, number>()
  for (const m of input.matchResults) {
    if (m.verdict === '適合') fit.set(m.tenant_id, (fit.get(m.tenant_id) ?? 0) + 1)
    else if (m.verdict === '要確認') review.set(m.tenant_id, (review.get(m.tenant_id) ?? 0) + 1)
  }

  return input.tenants.map(t => {
    const cond = condByTenant.get(t.id)
    return {
      tenantId: t.id,
      name: t.name ?? '(名称未設定)',
      hasConditions: cond !== undefined,
      deliveryFrequency: cond?.delivery_frequency ?? null,
      lastDeliveryAt: lastDelivery.get(t.id) ?? null,
      fitCount: fit.get(t.id) ?? 0,
      reviewCount: review.get(t.id) ?? 0,
    }
  })
}

// ---------------------------------------------------------------------------
// システム稼働状況
// ---------------------------------------------------------------------------

export interface BatchRunRow {
  step: string
  status: string
  started_at: string
}

export interface BatchSummary {
  failedCount: number
  lastByStep: Record<string, { status: string; started_at: string }>
}

export function summarizeBatchRuns(runs: BatchRunRow[]): BatchSummary {
  let failedCount = 0
  const lastByStep: Record<string, { status: string; started_at: string }> = {}

  for (const r of runs) {
    if (r.status === 'failed') failedCount += 1
    const existing = lastByStep[r.step]
    if (!existing || r.started_at > existing.started_at) {
      lastByStep[r.step] = { status: r.status, started_at: r.started_at }
    }
  }

  return { failedCount, lastByStep }
}

export interface LlmCostSummary {
  totalCostUsd: number
  byStep: Record<string, number>
}

export function aggregateLlmCost(
  usage: { step: string; cost_usd: number | string }[]
): LlmCostSummary {
  let totalCostUsd = 0
  const byStep: Record<string, number> = {}

  for (const u of usage) {
    // numeric 列は supabase-js から文字列で返ることがあるため数値化する
    const cost = Number(u.cost_usd) || 0
    totalCostUsd += cost
    byStep[u.step] = (byStep[u.step] ?? 0) + cost
  }

  return { totalCostUsd: Math.round(totalCostUsd * 1_000_000) / 1_000_000, byStep }
}

// ---------------------------------------------------------------------------
// 異常検知キュー
// ---------------------------------------------------------------------------

export interface AnomalyInput {
  tenantOps: TenantOpsRow[]
  sources: { name: string; last_fetched_at: string | null }[]
  failedBatchCount: number
  now: string
  /** ソース未取得とみなす経過時間（時間）。既定は10日 */
  staleHours?: number
}

/** 運用上の異常（フォロー対象）を人間可読メッセージの配列で返す */
export function detectAnomalies(input: AnomalyInput): string[] {
  const messages: string[] = []
  const staleMs = (input.staleHours ?? 24 * 10) * 60 * 60 * 1000
  const nowMs = new Date(input.now).getTime()

  // 条件設定済みなのに一度も配信されていないテナント
  for (const t of input.tenantOps) {
    if (t.hasConditions && t.lastDeliveryAt === null) {
      messages.push(`未配信: テナント「${t.name}」は条件設定済みだが配信実績がない`)
    }
  }

  // 長期間取得できていない収集ソース（API 仕様変更などの疑い）
  for (const s of input.sources) {
    const last = s.last_fetched_at ? new Date(s.last_fetched_at).getTime() : 0
    if (nowMs - last > staleMs) {
      messages.push(`収集停滞: ソース「${s.name}」が長期間更新されていない`)
    }
  }

  if (input.failedBatchCount > 0) {
    messages.push(`バッチ失敗: 直近で ${input.failedBatchCount} 件の失敗がある`)
  }

  return messages
}
