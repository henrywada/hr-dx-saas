import { redirect } from 'next/navigation'

import { APP_ROUTES } from '@/config/routes'
import { getServerUser } from '@/lib/auth/server-user'
import { InfoBankSearchClient } from '@/features/info-bank/components/InfoBankSearchClient'

export const metadata = {
  title: '社内AI情報バンク | HR-DX',
}

export default async function InfoBankPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4 px-4 py-5 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">社内AI情報バンク</h1>
        <p className="mt-1 text-sm text-slate-500">
          社内に登録された資料だけを根拠に回答します。インターネットは検索しません。資料に無いことは「情報がありません」と表示されます。
        </p>
      </div>
      <InfoBankSearchClient />
    </div>
  )
}
