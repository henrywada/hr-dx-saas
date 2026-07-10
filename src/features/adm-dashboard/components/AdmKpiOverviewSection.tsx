import type { ReactNode } from 'react'
import Link from 'next/link'
import { Bot } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'

interface AdmKpiOverviewSectionProps {
  children: ReactNode
}

/** /adm 上部の組織概要KPI行（詳細は AI人事アシスタントへ） */
export function AdmKpiOverviewSection({ children }: AdmKpiOverviewSectionProps) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-[#161b22]">組織概要</h2>
          <p className="text-xs text-[#57606a]">
            在籍・離職・採用の要点。月次の横断分析・CSV出力は横断KPIページで確認できます。
          </p>
        </div>
        <Link
          href={`${APP_ROUTES.TENANT.ADMIN_HR_ASSISTANT}?tab=assistant`}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#FD7601] bg-white px-3 py-1.5 text-xs font-medium text-[#161b22] shadow-xs transition-colors hover:bg-[#FFF4EB]"
        >
          <Bot className="h-4 w-4 text-[#FD7601]" />
          AI人事アシスタント
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  )
}
