import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type {
  CandidateRow,
  PositionWithCandidates,
  SuccessionDashboardData,
} from './types'

const EMPTY: SuccessionDashboardData = {
  positions: [],
  noSuccessorCount: 0,
  readyNowCount: 0,
  totalCandidateCount: 0,
}

/** サクセッションプラン全データを取得する */
export async function getSuccessionDashboardData(): Promise<SuccessionDashboardData> {
  const user = await getServerUser()
  if (!user?.tenant_id) return EMPTY

  const supabase = await createClient()

  const { data: positionRows, error: posErr } = await supabase
    .from('succession_positions')
    .select('id, title, division_id, current_holder_id, risk_level, notes, is_active')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)
    .order('sort_order')

  if (posErr || !positionRows || positionRows.length === 0) return EMPTY

  const positionIds = positionRows.map(p => p.id)

  const { data: candidateRows } = await supabase
    .from('succession_candidates')
    .select(
      'id, position_id, employee_id, readiness, performance_score, potential_score, development_actions, notes'
    )
    .in('position_id', positionIds)
    .order('sort_order')

  // 従業員情報を一括取得（現任者 + 候補者）
  const allEmployeeIds = [
    ...new Set([
      ...(positionRows.map(p => p.current_holder_id).filter(Boolean) as string[]),
      ...(candidateRows ?? []).map(c => c.employee_id),
    ]),
  ]

  const empMap = new Map<string, { name: string; department_name: string | null }>()

  if (allEmployeeIds.length > 0) {
    const { data: employees } = await supabase
      .from('employees')
      .select('id, name, division_id, divisions(name)')
      .in('id', allEmployeeIds)
      .eq('tenant_id', user.tenant_id)

    for (const e of employees ?? []) {
      const divData = e.divisions as { name: string } | { name: string }[] | null
      const deptName = Array.isArray(divData)
        ? (divData[0]?.name ?? null)
        : (divData?.name ?? null)
      empMap.set(e.id, { name: e.name ?? '', department_name: deptName })
    }
  }

  // 部署名を一括取得
  const divisionIds = positionRows
    .map(p => p.division_id)
    .filter(Boolean) as string[]
  const divMap = new Map<string, string>()

  if (divisionIds.length > 0) {
    const { data: divisions } = await supabase
      .from('divisions')
      .select('id, name')
      .in('id', divisionIds)

    for (const d of divisions ?? []) {
      divMap.set(d.id, d.name)
    }
  }

  // ポジションごとに候補者をグループ化
  const candidatesByPosition = new Map<string, CandidateRow[]>()
  for (const c of candidateRows ?? []) {
    const emp = empMap.get(c.employee_id)
    const row: CandidateRow = {
      id: c.id,
      position_id: c.position_id,
      employee_id: c.employee_id,
      employee_name: emp?.name ?? '（不明）',
      department_name: emp?.department_name ?? null,
      readiness: c.readiness as CandidateRow['readiness'],
      performance_score: c.performance_score,
      potential_score: c.potential_score,
      development_actions: c.development_actions,
      notes: c.notes,
    }
    const list = candidatesByPosition.get(c.position_id) ?? []
    list.push(row)
    candidatesByPosition.set(c.position_id, list)
  }

  const positions: PositionWithCandidates[] = positionRows.map(p => {
    const candidates = candidatesByPosition.get(p.id) ?? []
    const holder = p.current_holder_id ? empMap.get(p.current_holder_id) : null
    return {
      id: p.id,
      title: p.title,
      division_id: p.division_id,
      division_name: p.division_id ? (divMap.get(p.division_id) ?? null) : null,
      current_holder_id: p.current_holder_id,
      current_holder_name: holder?.name ?? null,
      risk_level: p.risk_level as PositionWithCandidates['risk_level'],
      notes: p.notes,
      is_active: p.is_active,
      candidates,
    }
  })

  return {
    positions,
    noSuccessorCount: positions.filter(p => p.candidates.length === 0).length,
    readyNowCount: positions.filter(p => p.candidates.some(c => c.readiness === 'ready_now')).length,
    totalCandidateCount: positions.reduce((sum, p) => sum + p.candidates.length, 0),
  }
}
