import { redirect } from 'next/navigation'
import { Clock } from 'lucide-react'
import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import {
  getOvertimeApplicationMonthRows,
  parseYearMonthOrDefault,
} from '@/features/overtime/queries'
import {
  monthlyClosureBlocksOvertimeApproval,
  yearMonthToClosureYearMonthKey,
} from '@/lib/overtime/month-closure'
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
  const [rows, closureRes] = await Promise.all([
    getOvertimeApplicationMonthRows(supabase, user.employee_id, yearMonth),
    user.tenant_id
      ? supabase
          .from('monthly_overtime_closures')
          .select('status')
          .eq('tenant_id', user.tenant_id)
          .eq('year_month', yearMonthToClosureYearMonthKey(yearMonth))
          .maybeSingle()
      : Promise.resolve({ data: null as { status: string | null } | null }),
  ])

  const monthClosureBlocksApplications = monthlyClosureBlocksOvertimeApproval(
    closureRes.data?.status,
  )

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1920px] space-y-8 px-4 py-8 pb-16">
      <div className="flex items-start gap-4">
        <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700 shadow-inner">
          <Clock className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">残業申請</h1>
          <div className="mt-2 max-w-3xl space-y-2 text-sm leading-relaxed text-slate-600">
            {monthClosureBlocksApplications ? (
              <>
                <p>
                  この対象月は月次締め処理が完了しています。一覧は閲覧のみで、新規の残業申請や申請内容の変更はできません。
                </p>
                <p className="text-xs text-slate-500">
                  承認済みの残業や勤怠の詳細は、必要に応じて管理者・上長へお問い合わせください。
                </p>
              </>
            ) : (
              <>
                <p>
                  月次の出退勤・残業申請の状況を、日付ごとに一覧できます。表示月は上部の「前月」「翌月」で切り替え、各行で出勤・退勤・残業の内容と承認状況を確認できます。
                </p>
                <p>
                  残業の新規申請や変更が必要な日は、行末の「申請」を押してモーダルを開き、残業の開始・終了時刻と理由を入力してください。残業時間はモーダル内の入力から算出されます。
                </p>
                <p>
                  残業理由が表では省略される場合は、同じ行の情報アイコンから全文の理由と承認者コメントを表示できます。
                </p>
                <p className="text-xs text-slate-500">
                  土日や休暇に該当する行の色分けなど、表の見方の詳細は一覧の直下の説明を参照してください。
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <OvertimeMonthTable
        yearMonth={yearMonth}
        rows={rows}
        monthClosureBlocksApplications={monthClosureBlocksApplications}
      />
    </div>
  )
}
