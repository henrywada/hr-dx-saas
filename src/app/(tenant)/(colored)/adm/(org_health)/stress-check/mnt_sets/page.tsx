import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import type { Metadata } from 'next'
import { MntSetsUI } from '@/features/adm/stress-check/mnt-sets/components/MntSetsUI'
import { getStressCheckPeriodsWithDivisions } from '@/features/adm/stress-check/mnt-sets/queries'
import { getDivisions } from '@/features/organization/queries'

export const metadata: Metadata = {
  title: '実施グループ管理 - ストレスチェック',
}

export default async function StressCheckMntSetsPage() {
  const user = await getServerUser()

  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const [periods, allDivisions] = await Promise.all([
    getStressCheckPeriodsWithDivisions(user.tenant_id),
    getDivisions(),
  ])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <MntSetsUI tenantId={user.tenant_id} periods={periods} allDivisions={allDivisions} />
    </div>
  )
}
