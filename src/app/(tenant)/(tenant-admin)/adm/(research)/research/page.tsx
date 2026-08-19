import { redirect } from 'next/navigation'

import { APP_ROUTES } from '@/config/routes'
import { getServerUser } from '@/lib/auth/server-user'
import { ResearchClient } from '@/features/law-research/components/ResearchClient'
import { listResearchHistory } from '@/features/law-research/queries'
import type { ResearchMode } from '@/features/law-research/types'

/** クエリのモード指定を検証する。不正値は労務法モードにフォールバックする */
function parseMode(value: unknown): ResearchMode {
  return value === 'tax' || value === 'labor' || value === 'law' ? value : 'labor'
}

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const params = await searchParams
  const initialMode = parseMode(params.mode)
  const history = await listResearchHistory()

  return <ResearchClient initialMode={initialMode} initialHistory={history} />
}
