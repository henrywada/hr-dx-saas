import { Suspense } from 'react'
import { redirect } from 'next/navigation'

import { APP_ROUTES } from '@/config/routes'
import { getServerUser } from '@/lib/auth/server-user'
import { NotionInfoBoardClient } from '@/features/notion-info/components/NotionInfoBoardClient'
import { getNotionInfoBoard } from '@/features/notion-info/queries'
import type { NotionInfoTab } from '@/features/notion-info/types'

import { NotionInfoBoardSkeleton } from './loading'

export const metadata = {
  title: '情報掲示板 | HR-DX',
}

/** クエリ ?tab= を許可タブに正規化する。不正値は最新人事トレンド */
function parseTab(value: unknown): NotionInfoTab {
  return value === 'grant' || value === 'ai' || value === 'hr_trend' ? value : 'hr_trend'
}

export default async function NotionInfoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const params = await searchParams
  const initialTab = parseTab(typeof params.tab === 'string' ? params.tab : undefined)
  const data = await getNotionInfoBoard()

  // useSearchParams を使う Client を Suspense で包み、CSR bailout の警告を避ける
  return (
    <Suspense fallback={<NotionInfoBoardSkeleton />}>
      <NotionInfoBoardClient initialTab={initialTab} data={data} />
    </Suspense>
  )
}
