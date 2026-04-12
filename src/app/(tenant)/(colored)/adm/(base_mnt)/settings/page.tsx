import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import { APP_ROUTES } from '@/config/routes'
import type { Database } from '@/lib/supabase/types'
import { TenantPortalSettingsForm } from '@/features/tenant-settings/components/TenantPortalSettingsForm'

type PortalEmailRow = Pick<
  Database['public']['Tables']['tenant_portal_settings']['Row'],
  'hr_inquiry_email'
>

async function SettingsSection() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_portal_settings')
    .select('hr_inquiry_email')
    .maybeSingle()

  if (error) {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        role="alert"
      >
        設定の読み込みに失敗しました: {error.message}
      </div>
    )
  }

  return (
    <TenantPortalSettingsForm initialHrInquiryEmail={(data as PortalEmailRow | null)?.hr_inquiry_email ?? null} />
  )
}

export default async function TenantSettingsPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">基本設定</h1>
        <p className="text-sm text-slate-500 mt-1">
          ポータルから利用するお問合せ先メールなど、テナント単位の設定を行います。
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-16" aria-busy="true">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="読み込み中" />
          </div>
        }
      >
        <SettingsSection />
      </Suspense>
    </div>
  )
}
