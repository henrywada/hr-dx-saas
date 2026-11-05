import { redirect } from 'next/navigation'

import { APP_ROUTES } from '@/config/routes'
import { getServerUser } from '@/lib/auth/server-user'
import { InfoBankAdminClient } from '@/features/info-bank/components/InfoBankAdminClient'
import { listInfoBankDocuments } from '@/features/info-bank/queries'

/** 取り込みは短い Server Action の連続で進めるが、Vercel Hobby でも収まるよう 60 秒を上限にする */
export const maxDuration = 60

export const metadata = {
  title: '情報バンク資料管理 | HR-DX',
}

export default async function InfoBankMntPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)
  if (!user.appRole || user.appRole === 'employee') redirect(APP_ROUTES.TENANT.PORTAL)

  const documents = await listInfoBankDocuments()

  return (
    <div className="mx-auto w-full max-w-[1920px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">情報バンク資料管理</h1>
        <p className="mt-1 text-sm text-slate-500">
          社内AI情報バンクに検索させる資料のアップロード、改訂版への入れ替え、タグ・キーワードの編集ができます。
        </p>
      </div>
      <InfoBankAdminClient documents={documents} />
    </div>
  )
}
