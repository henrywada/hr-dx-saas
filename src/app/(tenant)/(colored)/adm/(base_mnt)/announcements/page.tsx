import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getAnnouncementsForAdmin } from '@/features/dashboard/queries'
import { AnnouncementTable } from '@/features/dashboard/components/AnnouncementTable'

export default async function AnnouncementsPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const announcements = await getAnnouncementsForAdmin()

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <AnnouncementTable announcements={announcements} />
    </div>
  )
}
