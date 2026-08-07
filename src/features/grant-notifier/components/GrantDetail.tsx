import Link from 'next/link'
import { AlertTriangle, ArrowLeft, ExternalLink } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import type { GrantDetailView } from '@/features/grant-notifier/queries'
import type { Verdict } from '@/features/grant-notifier/types'
import { formatAmount, formatJstDate } from '@/features/grant-notifier/components/format'

/**
 * 助成金1件の詳細。AI の判定理由・確認すべき点と、助成金の概要・本文を表示する。
 */

interface GrantDetailProps {
  detail: GrantDetailView
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const style =
    verdict === '適合'
      ? 'bg-emerald-50 text-emerald-700'
      : verdict === '要確認'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-slate-100 text-slate-600'

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}
    >
      {verdict}
    </span>
  )
}

function MetaRow({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 border-b border-slate-100 py-2 last:border-b-0">
      <dt className="w-32 shrink-0 text-xs text-slate-500">{term}</dt>
      <dd className="text-xs text-slate-900">{value}</dd>
    </div>
  )
}

function ReasonCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      <ul className="list-disc space-y-1.5 pl-5 text-xs leading-relaxed text-slate-700">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export function GrantDetail({ detail }: GrantDetailProps) {
  const g = detail.grant

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4 px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <span className="flex items-center gap-2">
            <VerdictBadge verdict={detail.verdict} />
            <span className="font-mono text-xs text-slate-500">
              確信度 {Math.round(detail.confidence * 100)}%
            </span>
          </span>
          <h1 className="text-xl font-semibold leading-snug text-slate-900">{g.title}</h1>
        </div>
        <Link
          href={APP_ROUTES.TENANT.ADMIN_GRANT_NOTIFIER_ARCHIVE}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          アーカイブ一覧
        </Link>
      </header>

      {detail.reasons.length > 0 && <ReasonCard title="判定理由" items={detail.reasons} />}
      {detail.unclearPoints.length > 0 && (
        <ReasonCard title="確認すべき点" items={detail.unclearPoints} />
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">概要</h2>
        {g.summary && <p className="mb-3 text-xs leading-relaxed text-slate-700">{g.summary}</p>}
        <dl>
          <MetaRow term="発行主体" value={g.issuer ?? '—'} />
          <MetaRow term="対象地域" value={g.targetArea ?? '—'} />
          <MetaRow term="従業員要件" value={g.targetEmployees ?? '—'} />
          <MetaRow term="補助上限額" value={formatAmount(g.maxAmount)} />
          <MetaRow term="補助率" value={g.subsidyRate ?? '記載なし'} />
          <MetaRow
            term="申請期間"
            value={`${formatJstDate(g.acceptanceStartAt)} 〜 ${formatJstDate(g.acceptanceEndAt)}`}
          />
        </dl>
      </div>

      {g.detailText && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">本文</h2>
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
            {g.detailText}
          </p>
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        {g.externalUrl && (
          <a
            href={g.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            公式ページで詳細・申請を確認する
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
          </a>
        )}
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-amber-500" strokeWidth={2} />
          <p className="text-xs text-amber-900">
            この判定は AI による参考情報です。申請可否の最終確認は必ず公式情報でお願いします。
          </p>
        </div>
        <p className="text-[11px] text-slate-400">情報取得日: {formatJstDate(g.fetchedAt)}</p>
      </div>
    </div>
  )
}
