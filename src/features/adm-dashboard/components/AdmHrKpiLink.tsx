import Link from 'next/link'
import { BarChart3 } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'

type AdmHrKpiLinkProps = {
  /** hr-kpi ページ内のアンカー（例: development） */
  section?: 'recruit' | 'retention' | 'productivity' | 'engagement' | 'development'
  /** 表示バリアント */
  variant?: 'button' | 'text'
  className?: string
}

const SECTION_LABEL: Record<NonNullable<AdmHrKpiLinkProps['section']>, string> = {
  recruit: '採用KPI',
  retention: '定着KPI',
  productivity: '生産性KPI',
  engagement: 'エンゲージメントKPI',
  development: '育成KPI',
}

/** 人事ダッシュボードから横断KPI分析ページへの導線 */
export function AdmHrKpiLink({ section, variant = 'text', className = '' }: AdmHrKpiLinkProps) {
  const href = section
    ? `${APP_ROUTES.TENANT.ADMIN_HR_KPI}#${section}`
    : APP_ROUTES.TENANT.ADMIN_HR_KPI

  const label = section ? `${SECTION_LABEL[section]}の詳細` : '横断KPI分析'

  if (variant === 'button') {
    return (
      <Link
        href={href}
        className={`inline-flex items-center gap-1.5 rounded-md border border-[#e2e6ec] bg-white px-3 py-1.5 text-xs font-medium text-[#161b22] shadow-xs transition-colors hover:bg-[#f6f8fa] ${className}`}
      >
        <BarChart3 className="h-4 w-4 text-[#FD7601]" />
        {label}
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 text-xs font-medium text-[#FD7601] hover:underline ${className}`}
    >
      <BarChart3 className="h-3.5 w-3.5" />
      {label}
    </Link>
  )
}
