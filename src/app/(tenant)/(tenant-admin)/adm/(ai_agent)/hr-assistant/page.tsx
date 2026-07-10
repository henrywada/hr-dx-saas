import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import {
  listHrAssistantSessions,
  listHrAssistantMessages,
  listQuestionTemplates,
  listHrUpdateDocuments,
  listRecentHrUpdates,
} from '@/features/hr-assistant/queries'
import { HrAssistantClient } from '@/features/hr-assistant/components'
import type { HrAssistantMainTab } from '@/features/hr-assistant/types'

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
  const tabParam = typeof params.tab === 'string' ? params.tab : null
  const initialTab: HrAssistantMainTab =
    tabParam === 'assistant' || sessionId ? 'assistant' : 'updates'

  const [sessions, messages, templates, updateDocuments, recentUpdates] = await Promise.all([
    listHrAssistantSessions(),
    sessionId ? listHrAssistantMessages(sessionId) : Promise.resolve([]),
    listQuestionTemplates(),
    listHrUpdateDocuments(),
    listRecentHrUpdates(),
  ])

  return (
    <HrAssistantClient
      initialSessions={sessions}
      initialSessionId={sessionId}
      initialMessages={messages}
      templates={templates}
      updateDocuments={updateDocuments}
      recentUpdates={recentUpdates}
      initialTab={initialTab}
    />
  )
}
