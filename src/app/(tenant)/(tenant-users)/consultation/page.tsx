import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getMyConsultations, getEligibleManagers } from '@/features/consultation/queries'
import { ConsultationForm } from '@/features/consultation/components/ConsultationForm'
import { ConsultationHelpModalTrigger } from '@/features/consultation/components/ConsultationHelpModalTrigger'
import { CATEGORY_LABEL, STATUS_LABEL } from '@/features/consultation/labels'
import TenantBackLink from '@/components/common/TenantBackLink'

export const metadata = { title: '悩み・相談窓口' }

export default async function ConsultationPage() {
  const user = await getServerUser()
  if (!user?.employee_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const [consultations, eligibleManagers] = await Promise.all([
    getMyConsultations(user.employee_id),
    getEligibleManagers(),
  ])

  return (
    <div className="flex w-full flex-col gap-4 px-4 sm:px-6 py-5 mx-auto max-w-300">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h1 className="text-sm font-semibold">悩み・相談窓口</h1>
        <div className="flex items-center gap-2">
          <ConsultationHelpModalTrigger />
          <TenantBackLink />
        </div>
      </div>
      <ConsultationForm eligibleManagers={eligibleManagers} />
      <div className="flex flex-col gap-2">
        {consultations.map(c => (
          <Link
            key={c.id}
            href={APP_ROUTES.TENANT.CONSULTATION_DETAIL(c.id)}
            className="block w-full rounded-lg border border-slate-200 bg-white p-4 text-xs"
          >
            {CATEGORY_LABEL[c.category]} - {STATUS_LABEL[c.status]} -{' '}
            {format(new Date(c.created_at), 'M/d (E) HH:mm', { locale: ja })}
          </Link>
        ))}
      </div>
    </div>
  )
}
