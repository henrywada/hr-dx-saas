import Link from 'next/link'
import { LayoutDashboard } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'

/** 横断KPIページの役割説明と人事ダッシュボードへの戻り導線 */
export function HrKpiHubBanner() {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[#e2e6ec] bg-[#f6f8fa] px-4 py-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-[#161b22]">詳細分析ハブ</p>
        <p className="text-xs leading-relaxed text-[#57606a]">
          採用・定着・生産性・エンゲージメント・育成のKPIを月次で横断集計します。各機能への導線と評価期間切替は
          <span className="font-medium text-[#161b22]"> 人事ダッシュボード </span>
          で行い、本ページでは詳細指標の確認とCSV出力を行います。
        </p>
      </div>
      <Link
        href={APP_ROUTES.TENANT.ADMIN}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#e2e6ec] bg-white px-3 py-1.5 text-xs font-medium text-[#161b22] shadow-xs transition-colors hover:bg-white/80"
      >
        <LayoutDashboard className="h-4 w-4 text-[#FD7601]" />
        人事ダッシュボードへ
      </Link>
    </div>
  )
}
