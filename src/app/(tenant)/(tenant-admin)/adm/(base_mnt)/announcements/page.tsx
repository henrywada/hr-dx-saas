import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getAnnouncementsForAdmin,
  getEmployeeOptionsForAnnouncements,
} from '@/features/dashboard/queries'
import { AnnouncementTable } from '@/features/dashboard/components/AnnouncementTable'

export default async function AnnouncementsPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const [announcements, employees] = await Promise.all([
    getAnnouncementsForAdmin(),
    getEmployeeOptionsForAnnouncements(),
  ])

  return (
    <div className="max-w-6xl mx-auto">
      <AnnouncementTable announcements={announcements} employees={employees} />
    </div>
  )
}
