/**
 * 残業申請一覧（上長・同一部署）/approval
 */
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { getJSTYearMonth } from '@/lib/datetime'
import { APP_ROUTES } from '@/config/routes'
import { createClient } from '@/lib/supabase/server'
import { OvertimeApprovalClient } from './components/ApprovalTable'
import {
  canApproveOvertimeInDivision,
  type OvertimeApprovalTargetPeer,
} from './types'
import { getOvertimeApprovalTargetPeers } from '@/features/overtime/queries'

export const metadata = {
  title: '残業申請の承認',
}

export default async function OvertimeApprovalPage() {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  let approvalTargetPeers: OvertimeApprovalTargetPeer[] = []
  let divisionLabel: string | null = null

  if (user.is_manager === true && user.division_id) {
    const supabase = await createClient()
    const [peers, divRes] = await Promise.all([
      getOvertimeApprovalTargetPeers(supabase, user.tenant_id, user.division_id),
      supabase.from('divisions').select('name').eq('id', user.division_id).maybeSingle(),
    ])

    approvalTargetPeers = peers
    if (divRes.data?.name) {
      divisionLabel = divRes.data.name
    }
  }

  const canApprove = canApproveOvertimeInDivision(user) && Boolean(user.employee_id)

  return (
    <OvertimeApprovalClient
      tenantId={user.tenant_id}
      supervisorEmployeeId={user.employee_id ?? ''}
      isManager={user.is_manager === true}
      hasDivision={Boolean(user.division_id)}
      canApprove={canApprove}
      approvalTargetPeers={approvalTargetPeers}
      divisionLabel={divisionLabel}
      defaultMonth={getJSTYearMonth()}
    />
  )
}
