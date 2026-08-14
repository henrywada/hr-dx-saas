'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { BarChart3, Settings, Upload } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'

const TABS = [
  {
    href: APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK,
    label: '健診結果取込',
    Icon: Upload,
  },
  {
    href: APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_ANALYSIS,
    label: '受診率・組織分析',
    Icon: BarChart3,
  },
  {
    href: APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_SETTINGS,
    label: '設定',
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
          tab.href === APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK
            ? pathname === tab.href ||
              pathname.startsWith(APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_MANUAL)
            : tab.href === APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_SETTINGS
              ? pathname === tab.href ||
                pathname.startsWith(`${tab.href}/`) ||
                pathname.startsWith(APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_CONVERSION)
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
