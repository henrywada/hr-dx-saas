import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'

/** 旧URL。設定の変換サブタブへ誘導する */
export default async function AdminHealthCheckConversionRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string }>
}) {
  const { campaignId } = await searchParams
  const q = new URLSearchParams({ tab: 'conversion' })
  if (campaignId) q.set('campaignId', campaignId)
  redirect(`${APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_SETTINGS}?${q.toString()}`)
}
