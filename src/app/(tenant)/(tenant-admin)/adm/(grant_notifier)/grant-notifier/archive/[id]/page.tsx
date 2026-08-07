import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getGrantDetail } from '@/features/grant-notifier/queries'
import { GrantDetail } from '@/features/grant-notifier/components/GrantDetail'

export const metadata = {
  title: '助成金詳細 | 助成金情報配信 | HR-DX',
}

export default async function GrantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const { id } = await params
  const detail = await getGrantDetail(id)

  // 自テナントの判定が無い助成金（他テナント宛・判定前）は RLS により取得できない
  if (!detail) {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-4 px-4 py-5 sm:px-6">
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm font-medium text-slate-700">該当する助成金が見つかりませんでした</p>
          <Link
            href={APP_ROUTES.TENANT.ADMIN_GRANT_NOTIFIER_ARCHIVE}
            className="mt-4 inline-block rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            アーカイブ一覧へ戻る
          </Link>
        </div>
      </div>
    )
  }

  return <GrantDetail detail={detail} />
}
