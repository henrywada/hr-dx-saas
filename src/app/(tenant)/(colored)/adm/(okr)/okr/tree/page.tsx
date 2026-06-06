import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getObjectiveTree } from '@/features/okr/queries'
import { OkrTreeView } from '@/features/okr/components/OkrTreeView'

export const metadata = { title: 'OKR ツリービュー' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function OkrTreePage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const currentYear = new Date().getFullYear()
  const tree = await getObjectiveTree(currentYear)

  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* パスバー */}
        <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600">
          <Link
            href={APP_ROUTES.TENANT.ADMIN_OKR_DASHBOARD}
            className="hover:text-primary transition-colors"
          >
            OKR・目標管理
          </Link>
          <span>/</span>
          <span>ツリービュー</span>
        </div>

        {/* カードヘッダー */}
        <div className="flex items-center justify-between border-b border-gray-300 bg-gray-200 px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">OKR ツリービュー</h1>
            <p className="mt-1 text-sm text-gray-500">
              {currentYear}年度 — 目標の階層構造を一覧表示
            </p>
          </div>
          <Link
            href={APP_ROUTES.TENANT.ADMIN_OKR_DASHBOARD}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ダッシュボードへ
          </Link>
        </div>

        {/* カード本文 */}
        <div className="p-6">
          <OkrTreeView objectives={tree} />
        </div>
      </div>
    </div>
  )
}
