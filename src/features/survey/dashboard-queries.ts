import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'

// DB score は 1-10。表示は ÷2 で 0-5.0 スケールに変換
const toDisplayScore = (dbScore: number) => Math.round((dbScore / 2) * 10) / 10

// survey_period (YYYY-MM) → 表示ラベル (YYYY年M月度)
function periodToLabel(period: string): string {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return period
  return `${year}年${month}月度`
}

// 前期キーを返す (YYYY-MM 形式のみ対応)
function previousPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return ''
  if (month === 1) return `${year - 1}-12`
  return `${year}-${String(month - 1).padStart(2, '0')}`
}

const CATEGORY_COLOR_MAP: Record<string, string> = {
  仕事のやりがい: 'bg-indigo-500',
  職場環境: 'bg-emerald-500',
  人間関係: 'bg-blue-500',
  会社への共感: 'bg-amber-500',
  コミュニケーション: 'bg-violet-500',
  'ストレス・負荷': 'bg-rose-500',
  キャリア: 'bg-teal-500',
}
const FALLBACK_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-blue-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-orange-500',
]

export interface DashboardKPI {
  overallScore: number
  scoreChange: string | null
  responseRate: number
  respondedCount: number
  totalCount: number
  alertCount: number
}

export interface DashboardCategoryScore {
  name: string
  score: number
  max: number
  color: string
}

export interface DashboardDepartment {
  id: string
  name: string
  responseRate: number
  score: number
  status: '良好' | '安定' | '要注意'
}

export interface SurveyDashboardData {
  periodLabel: string
  kpi: DashboardKPI
  categoryScores: DashboardCategoryScore[]
  departments: DashboardDepartment[]
  recentComments: string[]
  hasData: boolean
}

const EMPTY_DATA: SurveyDashboardData = {
  periodLabel: '—',
  kpi: {
    overallScore: 0,
    scoreChange: null,
    responseRate: 0,
    respondedCount: 0,
    totalCount: 0,
    alertCount: 0,
  },
  categoryScores: [],
  departments: [],
  recentComments: [],
  hasData: false,
}

function deptStatus(score: number): '良好' | '安定' | '要注意' {
  if (score >= 3.8) return '良好'
  if (score >= 3.0) return '安定'
  return '要注意'
}

export async function getSurveyDashboardData(): Promise<SurveyDashboardData> {
  const user = await getServerUser()
  if (!user?.tenant_id) return EMPTY_DATA

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // 1. 最新の survey_period を取得
  const { data: latestRow } = await supabase
    .from('pulse_survey_responses')
    .select('survey_period')
    .order('survey_period', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestRow?.survey_period) return EMPTY_DATA
  const currentPeriod: string = latestRow.survey_period
  const prevPeriod = previousPeriod(currentPeriod)

  // 2. 当期・前期の全回答、設問マスタ、従業員情報を並行取得
  const [{ data: curRaw }, { data: prevRaw }, { data: questionRaw }, { data: empRaw }] =
    await Promise.all([
      supabase
        .from('pulse_survey_responses')
        .select('user_id, question_id, score, comment')
        .eq('survey_period', currentPeriod),
      prevPeriod
        ? supabase.from('pulse_survey_responses').select('score').eq('survey_period', prevPeriod)
        : Promise.resolve({ data: [] }),
      supabase.from('pulse_survey_questions').select('id, category').eq('is_active', true),
      supabase
        .from('employees')
        .select('user_id, divisions(id, name)')
        .eq('active_status', 'active'),
    ])

  type CurRow = { user_id: string; question_id: string; score: number; comment: string | null }
  type EmpRow = { user_id: string; divisions: { id: string; name: string } | null }

  const cur = (curRaw ?? []) as CurRow[]
  const prev = (prevRaw ?? []) as { score: number }[]
  const employees = (empRaw ?? []) as EmpRow[]

  if (cur.length === 0) return EMPTY_DATA

  // 設問ID → カテゴリの逆引きマップ
  const questionCategoryMap = new Map<string, string>(
    ((questionRaw ?? []) as { id: string; category: string }[]).map(q => [q.id, q.category])
  )

  // user_id → division の逆引きマップ
  const userDivMap = new Map<string, { id: string; name: string }>(
    employees.filter(e => e.user_id && e.divisions).map(e => [e.user_id, e.divisions!])
  )

  // 3. KPI 計算
  const respondedUserIds = new Set(cur.map(r => r.user_id))
  const respondedCount = respondedUserIds.size
  const curAvgDb = cur.reduce((sum, r) => sum + (r.score ?? 0), 0) / Math.max(cur.length, 1)
  const overallScore = toDisplayScore(curAvgDb)

  let scoreChange: string | null = null
  if (prev.length > 0) {
    const prevAvgDb = prev.reduce((sum, r) => sum + (r.score ?? 0), 0) / prev.length
    const diff = +(overallScore - toDisplayScore(prevAvgDb)).toFixed(1)
    scoreChange = (diff >= 0 ? '+' : '') + diff.toFixed(1)
  }

  const totalEmployees = employees.length
  const responseRate = totalEmployees > 0 ? Math.round((respondedCount / totalEmployees) * 100) : 0

  // 4. カテゴリ別スコア
  const categoryAgg = new Map<string, { sum: number; count: number }>()
  for (const r of cur) {
    const cat = questionCategoryMap.get(r.question_id) ?? '未分類'
    const acc = categoryAgg.get(cat) ?? { sum: 0, count: 0 }
    categoryAgg.set(cat, { sum: acc.sum + r.score, count: acc.count + 1 })
  }

  const categoryScores: DashboardCategoryScore[] = Array.from(categoryAgg.entries())
    .map(([name, { sum, count }], idx) => ({
      name,
      score: toDisplayScore(sum / count),
      max: 5.0,
      color: CATEGORY_COLOR_MAP[name] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
    }))
    .sort((a, b) => b.score - a.score)

  // 5. 部署別スコア
  type DivEntry = {
    name: string
    divId: string
    respondedUsers: Set<string>
    totalUsers: number
    scoreSum: number
    scoreCount: number
  }
  const divisionAgg = new Map<string, DivEntry>()

  for (const emp of employees) {
    if (!emp.divisions) continue
    const divId = emp.divisions.id
    if (!divisionAgg.has(divId)) {
      divisionAgg.set(divId, {
        name: emp.divisions.name,
        divId,
        respondedUsers: new Set(),
        totalUsers: 0,
        scoreSum: 0,
        scoreCount: 0,
      })
    }
    divisionAgg.get(divId)!.totalUsers++
  }

  for (const r of cur) {
    const div = userDivMap.get(r.user_id)
    if (!div) continue
    const entry = divisionAgg.get(div.id)
    if (!entry) continue
    entry.respondedUsers.add(r.user_id)
    entry.scoreSum += r.score ?? 0
    entry.scoreCount++
  }

  const departments: DashboardDepartment[] = Array.from(divisionAgg.values())
    .filter(d => d.totalUsers > 0)
    .map(d => {
      const score = d.scoreCount > 0 ? toDisplayScore(d.scoreSum / d.scoreCount) : 0
      const rate = Math.round((d.respondedUsers.size / d.totalUsers) * 100)
      return { id: d.divId, name: d.name, responseRate: rate, score, status: deptStatus(score) }
    })
    .sort((a, b) => a.score - b.score)

  const alertCount = departments.filter(d => d.status === '要注意').length

  // 6. フリーコメント（空行除外・最大20件・新着順）
  const recentComments = cur
    .filter(r => r.comment && r.comment.trim().length > 0)
    .map(r => r.comment!)
    .slice(0, 20)

  return {
    periodLabel: periodToLabel(currentPeriod),
    kpi: {
      overallScore,
      scoreChange,
      responseRate,
      respondedCount,
      totalCount: totalEmployees,
      alertCount,
    },
    categoryScores,
    departments,
    recentComments,
    hasData: true,
  }
}
