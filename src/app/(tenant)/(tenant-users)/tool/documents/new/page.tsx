// 文書撮影・登録画面 — Server Component
import { notFound, redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { tokyoToday } from '@/lib/documents/tokyoDate'
import { APP_ROUTES } from '@/config/routes'
import { CaptureHost } from './CaptureHost'

const ALLOWED = ['business_card', 'invoice', 'purchase_order', 'receipt'] as const

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  if (!ALLOWED.includes(type as (typeof ALLOWED)[number])) notFound()

  const user = await getServerUser()
  if (!user) redirect(APP_ROUTES.AUTH.LOGIN)
  if (!user.tenant_id) {
    return (
      <div className="mx-auto max-w-md p-6 text-sm text-gray-600">
        所属テナントが見つかりません。管理者にお問い合わせください。
      </div>
    )
  }
  if (!user.division_id) {
    return (
      <div className="mx-auto max-w-md p-6 text-sm text-gray-600">
        所属部署が未設定のため文書を登録できません。管理者にお問い合わせください。
      </div>
    )
  }

  return (
    <CaptureHost
      tenantId={user.tenant_id}
      userId={user.id}
      documentType={type as (typeof ALLOWED)[number]}
      defaultContextDate={tokyoToday()}
    />
  )
}
