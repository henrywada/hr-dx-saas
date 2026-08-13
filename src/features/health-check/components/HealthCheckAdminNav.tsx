'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { BarChart3, PenLine, Settings, Upload } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'

const TABS = [
  {
    href: APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK,
    label: 'データ取込（CSV）',
    match: 'exact' as const,
    Icon: Upload,
  },
  {
    href: APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_MANUAL,
    label: 'データ取込（手入力）',
    match: 'prefix' as const,
    Icon: PenLine,
  },
  {
    href: APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_ANALYSIS,
    label: '受診率・組織分析',
    match: 'prefix' as const,
    Icon: BarChart3,
  },
  {
    href: APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_SETTINGS,
    label: '設定',
    match: 'prefix' as const,
    Icon: Settings,
  },
]

export function HealthCheckAdminNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const campaignId = searchParams.get('campaignId')
  const qs = campaignId ? `?campaignId=${campaignId}` : ''

  return (
    <nav
      className="-mb-px flex flex-wrap gap-4 border-b border-slate-200"
      aria-label="健康診断管理"
    >
      {TABS.map(tab => {
        const active =
          tab.match === 'exact'
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={`${tab.href}${qs}`}
            className={`inline-flex items-center gap-1.5 pb-2.5 text-xs font-medium border-b-2 transition-colors ${
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <tab.Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
