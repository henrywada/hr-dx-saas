import { redirect } from 'next/navigation'
import { Clock } from 'lucide-react'
import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import {
  getOvertimeApplicationMonthRows,
  parseYearMonthOrDefault,
} from '@/features/overtime/queries'
import { OvertimeMonthTable } from './OvertimeMonthTable'

type Props = {
  params: Promise<Record<string, string>>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OvertimeApplicationPage({ params, searchParams }: Props) {
  await params
  const sp = await searchParams
  const yearMonth = parseYearMonthOrDefault(sp.ym)

  const user = await getServerUser()
  if (!user?.id) {
    redirect('/login')
  }

  if (!user.employee_id) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-slate-600">
          従業員情報が見つかりません。管理者にお問い合わせください。
        </p>
      </div>
    )
  }

  const supabase = await createClient()
  const rows = await getOvertimeApplicationMonthRows(
    supabase,
    user.employee_id,
    yearMonth,
  )

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1920px] space-y-8 px-4 py-8 pb-16">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700 shadow-inner">
          <Clock className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">残業申請</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            月次の出退勤・残業申請状況を確認できます。行の「申請」から残業を申請してください（残業時間はモーダル内で入力します）。
          </p>
        </div>
      </div>

      <OvertimeMonthTable yearMonth={yearMonth} rows={rows} />
    </div>
  )
}
