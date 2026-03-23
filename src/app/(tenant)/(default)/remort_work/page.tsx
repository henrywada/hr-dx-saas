import { redirect } from 'next/navigation'
import { Laptop } from 'lucide-react'
import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import StartButton from './components/StartButton'
import EndForm from './components/EndForm'
import DailyStatus from './components/DailyStatus'

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

  const supabase = await createClient()
  const { data: devices } = await supabase
    .from('telework_pc_devices')
    .select('id, device_name')
    .eq('user_id', user.id)
    .eq('approved', true)
    .order('registered_at', { ascending: false })

  const deviceList = (devices ?? []).map((d) => ({
    id: d.id,
    device_name: d.device_name,
  }))

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
            作業の開始・終了を記録します。承認済みの社用端末を選び、位置情報は許可がある場合のみ送信されます。
          </p>
        </div>
      </div>

      <DailyStatus />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-lg text-slate-800">作業開始</h2>
        <StartButton devices={deviceList} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-lg text-slate-800">作業終了</h2>
        <EndForm />
      </section>
    </div>
  )
}
