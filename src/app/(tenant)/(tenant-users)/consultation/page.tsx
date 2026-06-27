import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getMyConsultations } from '@/features/consultation/queries'
import { ConsultationForm } from '@/features/consultation/components/ConsultationForm'

export const metadata = { title: '悩み・相談窓口' }

export default async function ConsultationPage() {
  const user = await getServerUser()
  if (!user?.employee_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const consultations = await getMyConsultations(user.employee_id)

  return (
    <div className="flex flex-col gap-4 px-4 sm:px-6 py-5 mx-auto max-w-300">
      <h1 className="text-sm font-semibold">悩み・相談窓口</h1>
      <ConsultationForm />
      <div className="flex flex-col gap-2">
        {consultations.map(c => (
          <Link
            key={c.id}
            href={`/consultation/${c.id}`}
            className="rounded-lg border border-slate-200 bg-white p-4 text-xs"
          >
            {c.category} - {c.status}
          </Link>
        ))}
      </div>
    </div>
  )
}
