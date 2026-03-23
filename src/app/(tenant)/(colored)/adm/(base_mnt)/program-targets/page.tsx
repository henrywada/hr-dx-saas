import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getProgramInstancesForAdmin } from '@/features/program-targets/queries'
import { ProgramInstanceTable } from '@/features/program-targets/components/ProgramInstanceTable'

export default async function ProgramTargetsPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const instances = await getProgramInstancesForAdmin(user.tenant_id)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <ProgramInstanceTable instances={instances} />
    </div>
  )
}
