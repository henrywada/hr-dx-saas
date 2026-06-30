import type { ReactNode } from 'react'
import { AdmHrKpiLink } from './AdmHrKpiLink'

interface AdmKpiOverviewSectionProps {
  children: ReactNode
}

/** /adm 上部の組織概要KPI行（詳細は横断KPIページへ） */
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
        <AdmHrKpiLink variant="button" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  )
}
