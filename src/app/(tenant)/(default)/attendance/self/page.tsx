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
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-8">
        わたしの勤退カレンダー
      </h1>
      <AttendanceSelfView
        initialYear={initialYear}
        initialMonth={initialMonth}
      />
    </div>
  )
}
