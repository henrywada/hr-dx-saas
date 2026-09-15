// 写真レポートホルダー（アルバム画面）
// Server Component: queries.ts の読み取り関数のみを呼び出し、supabase.from(...) は直接呼ばない
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import {
  getAlbumPage,
  getAlbumSubjectOptions,
  canViewTeamAlbum,
} from '@/features/picture-report/queries'
import { APP_ROUTES } from '@/config/routes'
import { AlbumView } from './AlbumView'

const PAGE_SIZE = 100

export default async function PictureReportAlbumPage() {
  const user = await getServerUser()
  if (!user?.id) redirect(APP_ROUTES.AUTH.LOGIN)

  const isManager = await canViewTeamAlbum()
  const [ownPage, ownSubjectOptions] = await Promise.all([
    getAlbumPage({ scope: 'own', offset: 0, limit: PAGE_SIZE }),
    getAlbumSubjectOptions('own'),
  ])

  return (
    <AlbumView
      isManager={isManager}
      initialOwnItems={ownPage.items}
      initialOwnHasMore={ownPage.hasMore}
      initialOwnSubjectOptions={ownSubjectOptions}
      pageSize={PAGE_SIZE}
    />
  )
}
