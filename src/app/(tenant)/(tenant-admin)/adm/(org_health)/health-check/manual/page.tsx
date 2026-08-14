import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'

/** 旧URL。健診結果取込の手入力サブタブへ誘導する */
export default async function AdminHealthCheckManualRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string }>
}) {
  const { campaignId } = await searchParams
  const q = new URLSearchParams({ tab: 'manual' })
  if (campaignId) q.set('campaignId', campaignId)
  redirect(`${APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK}?${q.toString()}`)
}
