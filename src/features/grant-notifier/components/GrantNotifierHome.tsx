import Link from 'next/link'
import { AlertTriangle, Archive, CheckCircle2, Settings2, Sparkles } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import type { GrantNotifierOverview } from '@/features/grant-notifier/queries'
import { formatJstDateTime } from '@/features/grant-notifier/components/format'

/**
 * 助成金情報配信のホーム。条件設定の有無・配信実績の概況と、各画面への入口を並べる。
 */

interface GrantNotifierHomeProps {
  overview: GrantNotifierOverview
  /** 配信条件を編集できるか（テナント管理者のみ true） */
  canEdit: boolean
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export function GrantNotifierHome({ overview, canEdit }: GrantNotifierHomeProps) {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4 px-4 py-5 sm:px-6">
      <header className="space-y-1">
        <p className="text-xs font-medium tracking-wide text-[#FD7601]">便利ツール</p>
        <h1 className="text-xl font-semibold text-slate-900">助成金情報配信</h1>
        <p className="text-sm text-slate-500">
          自社の条件に合う新着・更新の助成金を AI が毎週チェックし、メールでお届けします。
        </p>
      </header>

      {!overview.hasConditions && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" strokeWidth={2} />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-900">まず配信条件を設定してください</p>
            <p className="text-xs text-amber-800">
              業種・所在地・関心カテゴリなどを登録すると、次回の配信から対象になります。
              {!canEdit && '（設定できるのはテナント管理者のみです）'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="配信されたメール"
          value={`${overview.deliveryBatchCount}通`}
          hint={
            overview.lastDeliveryAt
              ? `最終配信 ${formatJstDateTime(overview.lastDeliveryAt)}`
              : '配信実績なし'
          }
        />
        <StatTile
          label="お届けした助成金"
          value={`${overview.deliveredGrantCount}件`}
          hint="延べ件数"
        />
        <StatTile label="適合と判定" value={`${overview.fitCount}件`} hint="条件に合致" />
        <StatTile
          label="要確認と判定"
          value={`${overview.reviewCount}件`}
          hint="情報不足・要精査"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Link
          href={APP_ROUTES.TENANT.ADMIN_GRANT_NOTIFIER_CONDITIONS}
          className="group flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs transition-colors hover:border-[#FD7601]/50 hover:bg-orange-50/40"
        >
          <span className="rounded-lg bg-[#FD7601]/10 p-2.5 text-[#FD7601]">
            <Settings2 className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="space-y-1">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              配信条件を設定する
              {overview.hasConditions ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                  設定済
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  未設定
                </span>
              )}
            </span>
            <span className="block text-xs leading-relaxed text-slate-500">
              業種・所在地・従業員数・関心カテゴリ・通知先メール・配信頻度を登録します。
            </span>
          </span>
        </Link>

        <Link
          href={APP_ROUTES.TENANT.ADMIN_GRANT_NOTIFIER_ARCHIVE}
          className="group flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs transition-colors hover:border-[#FD7601]/50 hover:bg-orange-50/40"
        >
          <span className="rounded-lg bg-slate-100 p-2.5 text-slate-600">
            <Archive className="h-5 w-5" strokeWidth={2} />
          </span>
          <span className="space-y-1">
            <span className="block text-sm font-semibold text-slate-900">配信アーカイブを見る</span>
            <span className="block text-xs leading-relaxed text-slate-500">
              過去に送信したメールの原文と、助成金ごとの AI 判定理由を確認できます。
            </span>
          </span>
        </Link>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
        <p className="text-xs leading-relaxed text-slate-500">
          判定は AI による参考情報です。申請可否の最終確認は必ず公式情報でお願いします。
          配信は毎週月曜の朝に実行され、新着が0件の週はメールを送信しません。
        </p>
      </div>
    </div>
  )
}
