import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getDeliveryArchive } from '@/features/grant-notifier/queries'
import { ArchiveDeliveryTable } from '@/features/grant-notifier/components/ArchiveDeliveryTable'

export const metadata = {
  title: '配信アーカイブ | 助成金情報配信 | HR-DX',
}

export default async function GrantNotifierArchivePage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const batches = await getDeliveryArchive()

  return <ArchiveDeliveryTable batches={batches} />
}
