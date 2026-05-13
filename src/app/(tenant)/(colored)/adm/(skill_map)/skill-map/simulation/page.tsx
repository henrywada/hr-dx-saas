import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getSkillMapDrafts } from '@/features/skill-map/queries'
import Link from 'next/link'

export default async function SimulationListPage() {
  const user = await getServerUser()
  if (!user) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()
  const drafts = await getSkillMapDrafts(supabase)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">配置シミュレーション</h1>
        <Link
          href={`${APP_ROUTES.TENANT.ADMIN_SKILL_MAP_SIMULATION}/new`}
          className="bg-primary text-white px-4 py-2 rounded text-sm hover:bg-primary/90"
        >
          新規作成
        </Link>
      </div>
      <div className="space-y-2">
        {drafts.map(draft => (
          <Link
            key={draft.id}
            href={APP_ROUTES.TENANT.ADMIN_SKILL_MAP_SIMULATION_DETAIL(draft.id)}
            className="block border rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{draft.name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  draft.status === 'confirmed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {draft.status === 'confirmed' ? '適用済み' : '下書き'}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              更新: {new Date(draft.updated_at).toLocaleDateString('ja-JP')}
            </div>
          </Link>
        ))}
        {drafts.length === 0 && (
          <p className="text-gray-500 text-sm">シミュレーションはまだありません。</p>
        )}
      </div>
    </div>
  )
}
