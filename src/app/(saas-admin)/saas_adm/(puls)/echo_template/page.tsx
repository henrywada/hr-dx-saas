import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getEchoTemplates } from '@/features/echo-template/queries'
import EchoTemplateListClient from '@/features/echo-template/components/EchoTemplateListClient'

export const dynamic = 'force-dynamic'

export default async function EchoTemplatePage() {
  const user = await getServerUser()
  if (!user || user.appRole !== 'developer') {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const templates = await getEchoTemplates()

  return (
    <main className="flex-1 w-full min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <EchoTemplateListClient initialTemplates={templates} />
      </div>
    </main>
  )
}
