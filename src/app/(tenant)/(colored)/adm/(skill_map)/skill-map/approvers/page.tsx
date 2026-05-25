import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getSkillApprovers, getEvalApprovers } from '@/features/skill-portal/queries'
import { ApproversManager } from '@/features/skill-portal/components/ApproversManager'

type Props = {
  searchParams: Promise<{ tab?: string }>
}

export default async function SkillApproversPage(props: Props) {
  const user = await getServerUser()
  if (!user) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()
  const searchParams = await props.searchParams
  const tab = (searchParams?.tab as string) ?? 'skill'
  const activeTab = tab === 'eval' ? 'eval' : 'skill'

  const [approvers, evalRows, employeesRes] = await Promise.all([
    getSkillApprovers(supabase),
    getEvalApprovers(supabase),
    (supabase as any)
      .from('employees')
      .select('id, name, employee_no')
      .eq('active_status', 'active')
      .order('employee_no', { ascending: true }),
  ])

  const allEmployees = (employeesRes.data ?? []) as Array<{
    id: string
    name: string | null
    employee_no: string | null
  }>

  return (
    <div className="min-h-full">
      <div className="px-6 pb-6 pt-3">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-300 bg-gray-200 px-6 py-5">
            <h1 className="text-[1.35rem] font-bold text-gray-900 sm:text-[1.65rem]">
              承認者マスタ管理
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              スキル申請の上長承認者および人事評価の評価者を従業員ごとに設定します
            </p>
          </div>
          <div className="p-6">
            <ApproversManager
              approvers={approvers}
              allEmployees={allEmployees}
              evalRows={evalRows}
              activeTab={activeTab}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
