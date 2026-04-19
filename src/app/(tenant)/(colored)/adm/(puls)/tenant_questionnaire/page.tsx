import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import {
  getTenantEchoQuestionnaires,
  getEchoTemplatesForTenant,
} from '@/features/echo-template/queries'
import TenantEchoListClient from '@/features/echo-template/components/TenantEchoListClient'

export const dynamic = 'force-dynamic'

export default async function TenantQuestionnairePage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const [questionnaires, templates] = await Promise.all([
    getTenantEchoQuestionnaires(user.tenant_id),
    getEchoTemplatesForTenant(),
  ])

  return (
    <div className="p-6 max-w-[92rem] mx-auto w-full">
      <TenantEchoListClient
        tenantId={user.tenant_id}
        initialQuestionnaires={questionnaires}
        templates={templates}
      />
    </div>
  )
}
