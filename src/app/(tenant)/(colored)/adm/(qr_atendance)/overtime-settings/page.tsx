import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import { APP_ROUTES } from '@/config/routes'
import { OvertimeSettingsForm } from './components/OvertimeSettingsForm'
import type { Database } from '@/lib/supabase/types'

type OvertimeRow = Pick<
  Database['public']['Tables']['overtime_settings']['Row'],
  | 'id'
  | 'tenant_id'
  | 'monthly_limit_hours'
  | 'monthly_warning_hours'
  | 'annual_limit_hours'
  | 'average_limit_hours'
>

async function OvertimeSettingsSection() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('overtime_settings')
    .select(
      'id, tenant_id, monthly_limit_hours, monthly_warning_hours, annual_limit_hours, average_limit_hours'
    )
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
    <OvertimeSettingsForm key={data?.id ?? 'no-row'} initialRow={data as OvertimeRow | null} />
  )
}

export default async function OvertimeSettingsPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">残業閾値設定</h1>
        <p className="text-sm text-slate-500 mt-1">
          月間・年間・平均の残業上限と警告閾値を、テナント単位で設定します。
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-16" aria-busy="true">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="読み込み中" />
          </div>
        }
      >
        <OvertimeSettingsSection />
      </Suspense>
    </div>
  )
}
