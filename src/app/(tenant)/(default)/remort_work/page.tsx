import { redirect } from 'next/navigation'
import { Laptop } from 'lucide-react'
import { getServerUser } from '@/lib/auth/server-user'
import DailyStatus from './components/DailyStatus'
import EndWorkSection from './components/EndWorkSection'
import StartWorkSection from './components/StartWorkSection'

type Props = {
  params: Promise<Record<string, string>>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function RemortWorkPage({ params, searchParams }: Props) {
  await params
  await searchParams

  const user = await getServerUser()
  if (!user?.id) {
    redirect('/login')
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-10 pb-16">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-700 shadow-inner">
          <Laptop className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            テレワーク作業
          </h1>
          <p className="text-slate-600 text-sm mt-1 leading-relaxed">
            1 日 1 回、作業の開始・終了を記録します（終了後は同日に再開できません）。このブラウザで登録・承認された端末からのみ開始できます。位置情報は許可がある場合のみ送信されます。
          </p>
        </div>
      </div>

      <DailyStatus />

      <StartWorkSection />

      <EndWorkSection />
    </div>
  )
}
