import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { listHrAssistantSessions, listHrAssistantMessages } from '@/features/hr-assistant/queries'
import { HrAssistantClient } from '@/features/hr-assistant/components'

export default async function HrAssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const params = await searchParams
  const sessionId = typeof params.session === 'string' ? params.session : null

  const [sessions, messages] = await Promise.all([
    listHrAssistantSessions(),
    sessionId ? listHrAssistantMessages(sessionId) : Promise.resolve([]),
  ])

  return (
    <HrAssistantClient
      initialSessions={sessions}
      initialSessionId={sessionId}
      initialMessages={messages}
    />
  )
}
