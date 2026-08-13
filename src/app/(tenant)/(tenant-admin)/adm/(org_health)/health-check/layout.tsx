import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import TenantBackLink from '@/components/common/TenantBackLink'
import { HealthCheckAdminNav } from '@/features/health-check/components/HealthCheckAdminNav'
import { HR_ROLES } from '@/features/health-check/types'

export default async function HealthCheckAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser()
  if (!user?.tenant_id || !HR_ROLES.includes(user.appRole as (typeof HR_ROLES)[number])) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px] space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-sm font-semibold text-slate-900">健康診断管理</h1>
        <TenantBackLink className="self-start shrink-0" />
      </div>
      <Suspense fallback={null}>
        <HealthCheckAdminNav />
      </Suspense>
      {children}
    </div>
  )
}
