import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { toJSTDateString } from '@/lib/datetime'
import { AttendanceSelfView } from './components/AttendanceSelfView'

export default async function AttendanceSelfPage() {
  const user = await getServerUser()
  if (!user) {
    redirect('/login')
  }

  const ymd = toJSTDateString(new Date())
  const [yStr, mStr] = ymd.split('-')
  const initialYear = Number(yStr)
  const initialMonth = Number(mStr)

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
        勤怠確認
      </h1>
      <p className="text-sm text-slate-600 mt-1 mb-8 leading-relaxed">
        ログイン中の従業員本人の勤務記録のみ表示します（テナント・従業員で自動的に絞り込み）。
      </p>
      <AttendanceSelfView
        initialYear={initialYear}
        initialMonth={initialMonth}
      />
    </div>
  )
}
