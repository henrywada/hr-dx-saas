import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '実施期間管理 - ストレスチェック',
}

/** 実施期間は拠点マスタ画面で登録（旧 URL 互換でリダイレクト） */
export default async function StressCheckMntSetsPage() {
  const user = await getServerUser()

  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  redirect(APP_ROUTES.TENANT.ADMIN_DIVISION_ESTABLISHMENTS)
}
