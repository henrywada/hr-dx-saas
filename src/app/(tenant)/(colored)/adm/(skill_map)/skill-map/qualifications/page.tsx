import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getExpiringQualifications } from '@/features/skill-map/queries'
import { QualificationBadge } from '@/features/skill-map/components/QualificationBadge'

export default async function QualificationsPage() {
  const user = await getServerUser()
  if (!user) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()
  const expiring = await getExpiringQualifications(supabase)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">資格管理</h1>
      {expiring.length > 0 ? (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h2 className="font-semibold text-orange-700 mb-3">⚠ 期限30日以内の資格 ({expiring.length}件)</h2>
          <div className="space-y-2">
            {expiring.map((eq) => (
              <div key={eq.id} className="flex items-center gap-3">
                <QualificationBadge eq={eq} />
                <span className="text-sm text-gray-600">有効期限: {eq.expiry_date}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-gray-500">期限が近い資格はありません。</p>
      )}
    </div>
  )
}
