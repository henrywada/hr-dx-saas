'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, CheckCircle2, PlayCircle, Trash2, XCircle } from 'lucide-react'
import { deleteGrantBatchRun, triggerGrantBatch } from '@/features/grant-notifier/actions'
import type {
  BatchRunView,
  SaasGrantNotifierDashboard as DashboardData,
} from '@/features/grant-notifier/queries'
import type { BatchStep } from '@/features/grant-notifier/types'
import { formatDuration, formatJstDateTime } from '@/features/grant-notifier/components/format'

/**
 * 助成金情報配信バッチの運用監視ダッシュボード（SaaS管理者専用）。
 * テナント稼働状況・バッチ実行履歴・AI コスト・異常検知と、ステップ単位の手動再実行。
 */

interface SaasGrantNotifierDashboardProps {
  data: DashboardData
}

const STEP_LABEL: Record<string, string> = {
  collect: '収集',
  match: 'マッチング',
  deliver: '配信',
}

const STATUS_LABEL: Record<string, string> = {
  running: '実行中',
  success: '成功',
  failed: '失敗',
  skipped: 'スキップ',
}

const STATUS_STYLE: Record<string, string> = {
  running: 'bg-sky-50 text-sky-700',
  success: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  skipped: 'bg-slate-100 text-slate-600',
}

const RERUN_BUTTONS: { steps: BatchStep[]; label: string }[] = [
  { steps: ['collect'], label: '収集のみ' },
  { steps: ['match'], label: 'マッチングのみ' },
  { steps: ['deliver'], label: '配信のみ' },
  { steps: ['collect', 'match', 'deliver'], label: '全ステップ' },
]

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        STATUS_STYLE[status] ?? 'bg-slate-100 text-slate-600'
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function Card({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </header>
      {children}
    </section>
  )
}

export function SaasGrantNotifierDashboard({ data }: SaasGrantNotifierDashboardProps) {
  const [result, setResult] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [runningLabel, setRunningLabel] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BatchRunView | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  function handleRerun(steps: BatchStep[], label: string) {
    setResult(null)
    setRunningLabel(label)

    startTransition(async () => {
      const res = await triggerGrantBatch(steps)
      const detail = (res.steps ?? [])
        .map(
          s =>
            `${STEP_LABEL[s.step] ?? s.step}=${STATUS_LABEL[s.status] ?? s.status}(${s.processedCount}件)`
        )
        .join(' / ')

      setResult({
        tone: res.ok ? 'success' : 'error',
        text: res.ok
          ? `実行しました。${detail}`
          : `${res.error ?? '実行に失敗しました'}${detail ? `: ${detail}` : ''}`,
      })
      setRunningLabel(null)
    })
  }

  function confirmDelete() {
    if (!deleteTarget) return

    startDeleteTransition(async () => {
      const res = await deleteGrantBatchRun(deleteTarget.id)
      setResult(
        res.ok
          ? { tone: 'success', text: '実行履歴を1件削除しました。' }
          : { tone: 'error', text: res.error ?? '削除に失敗しました' }
      )
      setDeleteTarget(null)
    })
  }

  const batchSummary =
    Object.entries(data.batch.lastByStep)
      .map(
        ([step, r]) =>
          `${STEP_LABEL[step] ?? step}=${STATUS_LABEL[r.status] ?? r.status}（${formatJstDateTime(r.started_at)}）`
      )
      .join(' / ') || '—'

  const llmByStep =
    Object.entries(data.llm.byStep)
      .map(([step, cost]) => `${STEP_LABEL[step] ?? step}=$${cost.toFixed(4)}`)
      .join(' / ') || '—'

  const sourcesSummary =
    data.sources.map(s => `${s.name}（最終 ${formatJstDateTime(s.lastFetchedAt)}）`).join(' / ') ||
    '—'

  return (
    <div className="mx-auto w-full max-w-[1920px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <header className="space-y-1">
        <p className="text-xs font-medium tracking-wide text-[#FD7601]">SaaS管理 / 運営</p>
        <h1 className="text-xl font-semibold text-slate-900">助成金情報配信 バッチ管理</h1>
        <p className="text-sm text-slate-500">
          収集・マッチング・配信バッチの稼働状況を全テナント横断で確認し、手動で再実行します。
        </p>
      </header>

      {result && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-4 text-xs ${
            result.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
          role="status"
        >
          {result.tone === 'success' ? (
            <CheckCircle2 className="mt-px h-4 w-4 shrink-0" strokeWidth={2} />
          ) : (
            <XCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2} />
          )}
          {result.text}
        </div>
      )}

      {data.anomalies.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" strokeWidth={2} />
            異常検知キュー
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-800">
            {data.anomalies.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      <Card
        title="システム稼働状況"
        description="バッチの最終実行状況・AI コスト・収集ソースの取得状況。"
      >
        <dl className="space-y-0">
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-100 py-2">
            <dt className="w-36 shrink-0 text-xs text-slate-500">バッチ最終実行</dt>
            <dd className="text-xs text-slate-900">
              {batchSummary}
              {data.batch.failedCount > 0 && (
                <span className="text-red-600">（失敗 {data.batch.failedCount}）</span>
              )}
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-100 py-2">
            <dt className="w-36 shrink-0 text-xs text-slate-500">AI コスト合計</dt>
            <dd className="font-mono text-xs text-slate-900">
              ${data.llm.totalCostUsd.toFixed(4)}（{llmByStep}）
            </dd>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 py-2">
            <dt className="w-36 shrink-0 text-xs text-slate-500">収集ソース</dt>
            <dd className="text-xs text-slate-900">{sourcesSummary}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <span className="text-xs font-medium text-slate-500">手動再実行:</span>
          {RERUN_BUTTONS.map(({ steps, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => handleRerun(steps, label)}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-[#FD7601] hover:text-[#FD7601] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlayCircle className="h-3.5 w-3.5" strokeWidth={2} />
              {runningLabel === label ? '実行中…' : label}
            </button>
          ))}
        </div>
      </Card>

      <Card
        title="全テナント稼働状況"
        description="条件設定・配信実績・AI 判定件数をテナント単位で表示します。"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#e2e6ec] text-xs text-slate-500">
                <th className="px-4 py-1 font-medium">テナント</th>
                <th className="px-4 py-1 font-medium">条件</th>
                <th className="px-4 py-1 font-medium">頻度</th>
                <th className="px-4 py-1 font-medium">直近配信</th>
                <th className="px-4 py-1 font-medium">適合 / 要確認</th>
              </tr>
            </thead>
            <tbody>
              {data.tenantOps.map(t => (
                <tr key={t.tenantId} className="border-b border-[#e2e6ec] hover:bg-[#f6f8fa]">
                  <td className="px-4 py-1 text-xs text-slate-900">{t.name}</td>
                  <td className="px-4 py-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.hasConditions
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {t.hasConditions ? '設定済' : '未設定'}
                    </span>
                  </td>
                  <td className="px-4 py-1 text-xs text-slate-600">
                    {t.deliveryFrequency === 'monthly'
                      ? '月次'
                      : t.deliveryFrequency === 'weekly'
                        ? '週次'
                        : '—'}
                  </td>
                  <td className="px-4 py-1 font-mono text-xs text-slate-600">
                    {formatJstDateTime(t.lastDeliveryAt)}
                  </td>
                  <td className="px-4 py-1 font-mono text-xs text-slate-600">
                    {t.fitCount} / {t.reviewCount}
                  </td>
                </tr>
              ))}
              {data.tenantOps.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-500">
                    テナントがありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="バッチ実行履歴" description="直近20件（新しい順）。">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#e2e6ec] text-xs text-slate-500">
                <th className="px-4 py-1 font-medium">開始日時</th>
                <th className="px-4 py-1 font-medium">ステップ</th>
                <th className="px-4 py-1 font-medium">状態</th>
                <th className="px-4 py-1 font-medium">所要時間</th>
                <th className="px-4 py-1 font-medium">処理件数</th>
                <th className="px-4 py-1 font-medium">エラー</th>
                <th className="w-12 px-4 py-1 font-medium">
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.batchRuns.map(r => (
                <tr key={r.id} className="border-b border-[#e2e6ec] hover:bg-[#f6f8fa]">
                  <td className="px-4 py-1 font-mono text-xs text-slate-600">
                    {formatJstDateTime(r.startedAt)}
                  </td>
                  <td className="px-4 py-1 text-xs text-slate-900">
                    {STEP_LABEL[r.step] ?? r.step}
                  </td>
                  <td className="px-4 py-1">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-1 font-mono text-xs text-slate-600">
                    {formatDuration(r.startedAt, r.finishedAt)}
                  </td>
                  <td className="px-4 py-1 font-mono text-xs text-slate-600">{r.processedCount}</td>
                  <td className="px-4 py-1 text-xs text-slate-600">{r.errorMessage ?? '—'}</td>
                  <td className="px-4 py-1 text-right">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(r)}
                      // 実行中のログは進行中バッチの記録なので消させない
                      disabled={r.status === 'running' || isDeleting}
                      className="rounded-lg p-1.5 text-[#57606a] transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#57606a]"
                      title={r.status === 'running' ? '実行中は削除できません' : '削除'}
                      aria-label={`${formatJstDateTime(r.startedAt)} の${STEP_LABEL[r.step] ?? r.step}の実行履歴を削除`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {data.batchRuns.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-xs text-slate-500">
                    実行履歴がありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-[#e2e6ec] bg-white shadow-2xl">
            <div className="space-y-4 p-6">
              <h3 className="text-lg font-bold text-[#24292f]">実行履歴を削除</h3>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-800">
                  <span className="font-bold">
                    {formatJstDateTime(deleteTarget.startedAt)} の
                    {STEP_LABEL[deleteTarget.step] ?? deleteTarget.step}
                  </span>
                  の実行履歴を削除しますか？
                </p>
                <p className="mt-1 text-xs text-red-600">この操作は取り消せません。</p>
              </div>
              <p className="text-xs text-slate-500">
                削除するのは実行ログのみです。収集した助成金・判定結果・配信履歴には影響しません。
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-lg border border-[#e2e6ec] bg-white px-4 py-2 text-sm font-medium text-[#57606a] transition-colors hover:bg-[#f6f8fa]"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? '削除中...' : '削除する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
