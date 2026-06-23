import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getReferralNominationById } from '@/features/referral/queries'
import { ReferralDetailPanel } from '@/features/referral/components/ReferralDetailPanel'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: '推薦詳細 | HR-DX',
}

export default async function ReferralDetailPage({ params }: Props) {
  // 認証チェック
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const { id } = await params

  // 推薦レコード取得（存在しない場合は 404）
  const nomination = await getReferralNominationById(id)
  if (!nomination) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* 戻るリンク + ページタイトル */}
      <div>
        <Link
          href={APP_ROUTES.TENANT.ADMIN_REFERRAL}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-3"
        >
          <ChevronLeft className="h-4 w-4" />
          推薦一覧に戻る
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">推薦詳細: {nomination.nominee_name}</h1>
      </div>

      {/* 詳細パネル（クライアントコンポーネント） */}
      <ReferralDetailPanel nomination={nomination} />
    </div>
  )
}
