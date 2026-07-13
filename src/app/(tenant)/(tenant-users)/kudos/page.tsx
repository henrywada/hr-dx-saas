import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getKudosFeed, getActiveValueTags } from '@/features/recognition/queries'
import { getEmployees } from '@/features/organization/queries'
import { KudosFeed } from '@/features/recognition/components/KudosFeed'
import { KudosComposer } from '@/features/recognition/components/KudosComposer'
import { KudosHelpModalTrigger } from '@/features/recognition/components/KudosHelpModalTrigger'
import TenantBackLink from '@/components/common/TenantBackLink'

export const metadata = { title: '感謝・称賛' }

export default async function KudosPage() {
  const user = await getServerUser()
  if (!user?.employee_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const [items, employeesRaw, valueTags] = await Promise.all([
    getKudosFeed(user.employee_id),
    getEmployees(),
    getActiveValueTags(),
  ])

  const employeeOptions = employeesRaw
    .filter((e): e is typeof e & { name: string } => Boolean(e.name) && e.id !== user.employee_id)
    .map(e => ({ id: e.id, name: e.name }))

  return (
    <div className="px-4 sm:px-6 py-5 mx-auto max-w-300 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-sm font-semibold text-slate-900">感謝・称賛</h1>
        <div className="flex items-center gap-2">
          <KudosHelpModalTrigger />
          <TenantBackLink />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-1">
          <KudosComposer employees={employeeOptions} valueTags={valueTags} />
        </div>
        <div className="lg:col-span-2">
          <KudosFeed items={items} />
        </div>
      </div>
    </div>
  )
}
