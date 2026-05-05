'use server'

/**
 * AI職場改善提案エージェント — Server Actions
 *
 * ストレスチェック集団分析結果をAIが読み、具体的な職場改善提案を生成。
 * 第8章準拠：職場環境改善のためのPDCAサイクル支援。
 */

import { createClient } from '@/lib/supabase/server'
import { resolveEstablishmentIdForDivision } from '@/lib/stress/resolve-establishment'
import { getServerUser } from '@/lib/auth/server-user'
import type { GroupData } from '@/features/adm/stress-check/queries'

// ─────────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────────

export type AIProposal = {
  division_id: string | null
  division_name: string
  ai_generated_title: string
  ai_reason: string
  proposed_actions: string[]
  priority: '高' | '中' | '低'
  expected_effect: string
}

export type GenerateProposalsResult = {
  success: boolean
  proposals?: AIProposal[]
  error?: string
}

export type RegisterPlanResult = {
  success: boolean
  id?: string
  error?: string
}

// ─────────────────────────────────────────────
// System Prompt（第8章準拠｜職場環境改善）
// ─────────────────────────────────────────────

const SYSTEM_PROMPT = `あなたは労働安全衛生法に基づくストレスチェック実施マニュアル第8章に精通した職場環境改善の専門家です。

【入力】
ストレスチェックの集団分析結果（部署別の健康リスク、高ストレス率、4尺度スコア）が渡されます。

【出力ルール】
必ず以下の JSON 形式で、**3件**の職場改善提案を出力してください。JSON以外のテキストは一切含めないこと。

{
  "proposals": [
    {
      "division_id": "対象部署のID（全社向けの場合はnull）",
      "division_name": "部署名（全社向けの場合は「全社」）",
      "ai_generated_title": "提案タイトル（30文字以内）",
      "ai_reason": "この提案の根拠（集団分析のどの数値・傾向から導いたか、100文字程度）",
      "proposed_actions": ["具体的なアクション1", "具体的なアクション2", "具体的なアクション3"],
      "priority": "高" | "中" | "低",
      "expected_effect": "期待される効果（50文字程度）"
    }
  ]
}

【提案の優先付け】
- 健康リスク120超・高ストレス率が高い部署を優先
- 4尺度（仕事の負担、コントロール、上司サポート、同僚サポート）のうち低い項目を改善する提案
- 前回比で悪化している部署を優先

【具体性】
- 抽象的ではなく、実行可能な具体的アクションを記載
- 例：「1on1ミーティングの定期化」「業務負荷の可視化と優先順位付けのルール化」「休憩スペースの整備」`

// ─────────────────────────────────────────────
// generateAIProposals — 集団分析からAI提案を3件生成
// ─────────────────────────────────────────────

type GenerateProposalsInput = {
  layer?: number | null
  divisionId?: string | null
}

export async function generateAIProposals(
  input: GenerateProposalsInput = {}
): Promise<GenerateProposalsResult> {
  try {
    const user = await getServerUser()
    if (!user?.tenant_id) {
      return { success: false, error: '認証されていません。ログインしてください。' }
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey.includes('xxxxxxxx')) {
      return {
        success: false,
        error: 'OpenAI API キーが設定されていません。管理者にお問い合わせください。',
      }
    }

    // 集団分析データを取得
    // divisionId 指定時は VIEW から直接取得（RPC は exact-layer のみのため shallow leaf を含まない）
    let groups: GroupData[]
    const { getGroupAnalysis, getGroupAnalysisForLayer } =
      await import('@/features/adm/stress-check/queries')
    if (input.divisionId) {
      const allGroups = await getGroupAnalysis(user.tenant_id, true)
      const targeted = allGroups.filter(g => g.division_id === input.divisionId)
      groups = targeted.length > 0 ? targeted : allGroups
    } else if (input.layer != null) {
      groups = await getGroupAnalysisForLayer(user.tenant_id, input.layer)
    } else {
      groups = await getGroupAnalysis(user.tenant_id, true)
    }

    if (!groups || groups.length === 0) {
      return {
        success: false,
        error: '集団分析データがありません。ストレスチェックの集団分析を先に実施してください。',
      }
    }

    const analysisSummary = groups.map((g: GroupData) => ({
      division_id: g.division_id,
      division_name: g.name,
      member_count: g.member_count,
      high_stress_rate: g.high_stress_rate,
      health_risk: g.health_risk,
      workload: g.workload,
      control: g.control,
      supervisor_support: g.supervisor_support,
      colleague_support: g.colleague_support,
      previous_health_risk: g.previous_health_risk,
      period_name: g.period_name,
    }))

    const divisionContext =
      input.divisionId && analysisSummary.length > 0
        ? `対象部署「${analysisSummary[0].division_name}」に集中した改善提案を3件生成してください。`
        : '全体データから優先度の高い部署を選んで改善提案を3件生成してください。'

    const userPrompt = `${divisionContext}\n\n【集団分析データ】\n${JSON.stringify(analysisSummary, null, 2)}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[AI職場改善] OpenAI API error:', errorText)
      let userMessage = 'AI生成中にエラーが発生しました。しばらくしてからお試しください。'
      try {
        const errJson = JSON.parse(errorText) as { error?: { message?: string; code?: string } }
        const msg = errJson?.error?.message
        if (msg) {
          if (msg.includes('api_key') || msg.includes('API key') || msg.includes('Invalid')) {
            userMessage =
              'OpenAI API キーが無効です。.env.local の OPENAI_API_KEY を確認してください。'
          } else if (msg.includes('rate') || msg.includes('quota') || msg.includes('limit')) {
            userMessage = 'API利用制限に達しました。しばらくしてからお試しください。'
          } else {
            userMessage = msg.length > 100 ? msg.slice(0, 100) + '…' : msg
          }
        }
      } catch {
        // JSON パース失敗時は汎用メッセージのまま
      }
      return { success: false, error: userMessage }
    }

    const completion = await response.json()
    const content = completion.choices?.[0]?.message?.content
    if (!content) {
      return { success: false, error: 'AIからの応答が空でした。' }
    }

    const parsed = JSON.parse(content)
    const proposals = parsed.proposals as AIProposal[]

    if (!Array.isArray(proposals) || proposals.length === 0) {
      return { success: false, error: 'AIからの応答形式が不正です。' }
    }

    // 型を正規化（division_id が文字列の場合）
    const normalized = proposals.slice(0, 3).map((p: AIProposal) => ({
      ...p,
      division_id: p.division_id === 'null' || !p.division_id ? null : String(p.division_id),
      division_name: p.division_name || '全社',
      proposed_actions: Array.isArray(p.proposed_actions) ? p.proposed_actions : [],
      priority: ['高', '中', '低'].includes(p.priority) ? p.priority : ('中' as const),
    }))

    return { success: true, proposals: normalized }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error('[AI職場改善] generateAIProposals error:', err)
    // ネットワークエラー等をユーザーに分かりやすく
    if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('ECONNREFUSED')) {
      return { success: false, error: 'ネットワークエラーです。接続を確認してください。' }
    }
    if (errMsg.includes('JSON') || errMsg.includes('parse')) {
      return { success: false, error: 'AIの応答形式が不正でした。もう一度お試しください。' }
    }
    return {
      success: false,
      error: errMsg.length > 80 ? '予期せぬエラーが発生しました。' : errMsg,
    }
  }
}

// ─────────────────────────────────────────────
// registerImprovementPlan — 職場改善計画をDBに登録
// ─────────────────────────────────────────────

export async function registerImprovementPlan(
  proposal: AIProposal,
  options: { setFollowUp: boolean }
): Promise<RegisterPlanResult> {
  try {
    const user = await getServerUser()
    if (!user?.tenant_id) {
      return { success: false, error: '認証されていません。' }
    }

    const supabase = (await createClient()) as any

    let sourceDivisionEstablishmentId: string | null = null
    if (proposal.division_id) {
      const { data: anchorRows } = await supabase
        .from('division_establishment_anchors')
        .select('division_establishment_id, division_id')
        .eq('tenant_id', user.tenant_id)
      const { data: divRows } = await supabase
        .from('divisions')
        .select('id, parent_id')
        .eq('tenant_id', user.tenant_id)
      const divisionsById = new Map<string, { id: string; parent_id: string | null }>(
        (divRows ?? []).map((d: { id: string; parent_id: string | null }) => [
          d.id,
          { id: d.id, parent_id: d.parent_id },
        ])
      )
      sourceDivisionEstablishmentId = resolveEstablishmentIdForDivision(
        proposal.division_id,
        user.tenant_id,
        (anchorRows ?? []) as { division_establishment_id: string; division_id: string }[],
        divisionsById
      )
    }

    // follow_up_date: 3ヶ月後フォロー設定時は登録日+3ヶ月
    let followUpDate: string | null = null
    if (options.setFollowUp) {
      const d = new Date()
      d.setMonth(d.getMonth() + 3)
      followUpDate = d.toISOString().slice(0, 10)
    }

    const { data, error } = await supabase
      .from('workplace_improvement_plans')
      .insert({
        tenant_id: user.tenant_id,
        division_id: proposal.division_id || null,
        source_analysis_id: null,
        ai_generated_title: proposal.ai_generated_title,
        ai_reason: proposal.ai_reason,
        proposed_actions: proposal.proposed_actions,
        priority: proposal.priority,
        status: '提案済',
        registered_by: user.employee_id ?? null,
        expected_effect: proposal.expected_effect || null,
        follow_up_date: followUpDate,
        source_division_establishment_id: sourceDivisionEstablishmentId,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[AI職場改善] registerImprovementPlan error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (err) {
    console.error('[AI職場改善] registerImprovementPlan error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : '登録に失敗しました。',
    }
  }
}

// ─────────────────────────────────────────────
// fetchImprovementPlans — 登録済み計画一覧を取得（クライアントから呼び出し用）
// ─────────────────────────────────────────────

import type { ImprovementPlan } from './queries'

export type FetchPlansResult = {
  success: boolean
  plans?: ImprovementPlan[]
  error?: string
}

export async function fetchImprovementPlans(): Promise<FetchPlansResult> {
  try {
    const user = await getServerUser()
    if (!user?.tenant_id) {
      return { success: false, error: '認証されていません。' }
    }

    const supabase = (await createClient()) as any
    const { data, error } = await supabase
      .from('workplace_improvement_plans')
      .select('*, divisions(name)')
      .eq('tenant_id', user.tenant_id)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    const plans = (data || []).map((row: Record<string, unknown>) => ({
      ...row,
      proposed_actions: Array.isArray(row.proposed_actions) ? row.proposed_actions : [],
      division_name: (row.divisions as { name?: string } | null)?.name ?? null,
    })) as ImprovementPlan[]

    return { success: true, plans }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '取得に失敗しました。',
    }
  }
}

// ─────────────────────────────────────────────
// deleteImprovementPlan — 職場改善計画を削除
// ─────────────────────────────────────────────

export type DeletePlanResult = {
  success: boolean
  error?: string
}

export async function deleteImprovementPlan(planId: string): Promise<DeletePlanResult> {
  try {
    const user = await getServerUser()
    if (!user?.tenant_id) {
      return { success: false, error: '認証されていません。' }
    }

    const supabase = (await createClient()) as any
    const { error } = await supabase
      .from('workplace_improvement_plans')
      .delete()
      .eq('id', planId)
      .eq('tenant_id', user.tenant_id) // RLS の二重確認

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '削除に失敗しました。',
    }
  }
}

// ─────────────────────────────────────────────
// fetchGroupAnalysisForLayer — 指定レイヤーの集団分析を取得（クライアントから呼び出し用）
// ─────────────────────────────────────────────

export type FetchLayerAnalysisResult = {
  success: boolean
  groups?: GroupData[]
  submittedCountMap?: Record<string, number>
  error?: string
}

// ─────────────────────────────────────────────
// fetchDistributionStats — 組織別 実施者・高ストレス者分布データを取得
// ─────────────────────────────────────────────

export type DivisionTreeNode = {
  id: string
  name: string
  parent_id: string | null
  layer: number | null
  code: string | null
  directEmployeeCount: number
}

export type FetchDistributionStatsResult = {
  success: boolean
  divisions?: DivisionTreeNode[]
  submissionCounts?: Record<string, number>
  highStressByDivision?: Record<string, number>
  error?: string
}

export async function fetchDistributionStats(): Promise<FetchDistributionStatsResult> {
  try {
    const user = await getServerUser()
    if (!user?.tenant_id) {
      return { success: false, error: '認証されていません。' }
    }

    const { getDivisionsWithCounts, getHighStressEmployees, getSubmissionCountsByDivision } =
      await import('@/features/adm/high-stress/queries')

    const { getActivePeriod } = await import('@/features/stress-check/queries')
    const period = await getActivePeriod()

    const divisions = await getDivisionsWithCounts(user.tenant_id)
    const divisionTreeNodes: DivisionTreeNode[] = divisions.map(d => ({
      id: d.id,
      name: d.name,
      parent_id: d.parent_id,
      layer: d.layer,
      code: d.code,
      directEmployeeCount: d.directEmployeeCount,
    }))

    if (!period) {
      return {
        success: true,
        divisions: divisionTreeNodes,
        submissionCounts: {},
        highStressByDivision: {},
      }
    }

    const [employees, submissionCounts] = await Promise.all([
      getHighStressEmployees(period.id),
      getSubmissionCountsByDivision(user.tenant_id, period.id),
    ])

    const highStressByDivision: Record<string, number> = {}
    for (const emp of employees) {
      if (emp.division_id) {
        highStressByDivision[emp.division_id] = (highStressByDivision[emp.division_id] ?? 0) + 1
      }
    }

    return { success: true, divisions: divisionTreeNodes, submissionCounts, highStressByDivision }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'データ取得に失敗しました。',
    }
  }
}

export async function fetchGroupAnalysisForLayer(
  layer: number | null,
  isAll = false
): Promise<FetchLayerAnalysisResult> {
  try {
    const user = await getServerUser()
    if (!user?.tenant_id) {
      return { success: false, error: '認証されていません。' }
    }

    // 全部署の従業員数と部署ツリーを取得（high-stress と同じソース）
    const { getDivisionsWithCounts } = await import('@/features/adm/high-stress/queries')
    const divisionNodes = await getDivisionsWithCounts(user.tenant_id)

    // 子部署マップ（subtree 集計用）
    const childrenMap = new Map<string, string[]>()
    for (const d of divisionNodes) {
      if (d.parent_id) {
        const arr = childrenMap.get(d.parent_id) ?? []
        arr.push(d.id)
        childrenMap.set(d.parent_id, arr)
      }
    }

    function getAllDescendantIds(id: string): Set<string> {
      const result = new Set<string>([id])
      for (const childId of childrenMap.get(id) ?? []) {
        getAllDescendantIds(childId).forEach(d => result.add(d))
      }
      return result
    }

    const nodeMap = new Map(divisionNodes.map(d => [d.id, d]))

    // 子を持つ部署IDのセット（shallow leaf 判定用）
    const hasChildren = new Set<string>(childrenMap.keys())

    // layer 列は不正確な場合があるため parent_id から実際の木深さを計算（ルート = 1）
    const depthMap = new Map<string, number>()
    for (const d of divisionNodes) {
      if (d.parent_id === null) depthMap.set(d.id, 1)
    }
    let depthChanged = true
    while (depthChanged) {
      depthChanged = false
      for (const d of divisionNodes) {
        if (!depthMap.has(d.id) && d.parent_id != null && depthMap.has(d.parent_id)) {
          depthMap.set(d.id, depthMap.get(d.parent_id)! + 1)
          depthChanged = true
        }
      }
    }

    // effective divisions を決定（depth ベース・layer 列に依存しない）
    const effectiveDivIds: Set<string> =
      layer == null
        ? new Set(divisionNodes.filter(d => d.parent_id === null).map(d => d.id))
        : new Set<string>([
            ...divisionNodes.filter(d => depthMap.get(d.id) === layer).map(d => d.id),
            ...divisionNodes
              .filter(d => {
                const depth = depthMap.get(d.id) ?? 0
                return depth < layer && !hasChildren.has(d.id)
              })
              .map(d => d.id),
          ])

    // fetchDistributionStats と同じ期間ソースを使用（active 期間 → 最新期間フォールバック）
    const supabase = (await createClient()) as any
    const { getActivePeriod } = await import('@/features/stress-check/queries')
    const activePeriod = await getActivePeriod()
    let period: { id: string; title: string } | null = activePeriod
      ? { id: activePeriod.id, title: activePeriod.title ?? '' }
      : null
    if (!period) {
      const { data: periods } = await supabase
        .from('stress_check_periods')
        .select('id, title, end_date')
        .eq('tenant_id', user.tenant_id)
        .order('end_date', { ascending: false })
        .limit(1)
      period = (periods?.[0] ?? null) as { id: string; title: string } | null
    }

    // 従業員の所属部署マップ
    const empDivisionMap = new Map<string, string>()
    const { data: empRows } = await supabase
      .from('employees')
      .select('id, division_id')
      .eq('tenant_id', user.tenant_id)
    for (const e of empRows ?? []) {
      if (e.division_id) empDivisionMap.set(e.id as string, e.division_id as string)
    }

    // 提出数（実施者数）を取得
    let rawSubmissions: Record<string, number> = {}
    if (period) {
      const { getSubmissionCountsByDivision } = await import('@/features/adm/high-stress/queries')
      rawSubmissions = await getSubmissionCountsByDivision(user.tenant_id, period.id)
    }

    // stress_check_results から直接スコアを取得（閾値なし）
    type ResultRow = {
      employee_id: string
      is_high_stress: boolean
      score_a: number | null
      score_b: number | null
      score_c: number | null
      score_d: number | null
    }
    let resultRows: ResultRow[] = []
    if (period) {
      const { data } = await supabase
        .from('stress_check_results')
        .select('employee_id, is_high_stress, score_a, score_b, score_c, score_d')
        .eq('period_id', period.id)
      resultRows = (data ?? []) as ResultRow[]
    }

    const avg = (vals: (number | null)[]): number | null => {
      const nums = vals.filter((v): v is number => v != null)
      return nums.length > 0
        ? Math.round((nums.reduce((s, v) => s + v, 0) / nums.length) * 10) / 10
        : null
    }

    // 「全て」モード: 全データを1行に集約して返す
    if (isAll) {
      const memberCount = divisionNodes.reduce((s, d) => s + d.directEmployeeCount, 0)
      const totalSubmitted = Object.values(rawSubmissions).reduce((s, v) => s + v, 0)
      const n = resultRows.length
      const suppressed = n === 0
      const workload = suppressed ? null : avg(resultRows.map(r => r.score_a))
      const control = suppressed ? null : avg(resultRows.map(r => r.score_b))
      const supervisorSupport = suppressed ? null : avg(resultRows.map(r => r.score_c))
      const colleagueSupport = suppressed ? null : avg(resultRows.map(r => r.score_d))
      const highCount = resultRows.filter(r => r.is_high_stress).length
      const highStressRate = suppressed ? null : Math.round((highCount / n) * 1000) / 10
      const healthRisk =
        workload != null && control != null && supervisorSupport != null && colleagueSupport != null
          ? Math.round(((workload + control + supervisorSupport + colleagueSupport) / 4) * 10) / 10
          : null
      return {
        success: true,
        groups: [
          {
            division_id: '',
            name: '全て',
            tenant_id: user.tenant_id,
            member_count: memberCount,
            high_stress_rate: highStressRate,
            health_risk: healthRisk,
            workload,
            control,
            supervisor_support: supervisorSupport,
            colleague_support: colleagueSupport,
            period_name: period?.title ?? '',
            is_latest: true,
            is_suppressed: suppressed,
            analysis_kind: 'layer' as const,
          },
        ],
        submittedCountMap: { '': totalSubmitted },
      }
    }

    // subtree ごとに提出数を集計
    const submittedCountMap: Record<string, number> = {}
    for (const divId of effectiveDivIds) {
      const descendantIds = getAllDescendantIds(divId)
      submittedCountMap[divId] = Array.from(descendantIds).reduce(
        (sum, id) => sum + (rawSubmissions[id] ?? 0),
        0
      )
    }

    // effective divisions ごとに subtree を集計してグループデータを構築
    const groups: GroupData[] = []
    for (const divId of effectiveDivIds) {
      const div = nodeMap.get(divId)
      if (!div) continue

      const descendantIds = getAllDescendantIds(divId)
      const memberCount = Array.from(descendantIds).reduce(
        (sum, id) => sum + (nodeMap.get(id)?.directEmployeeCount ?? 0),
        0
      )

      const subtreeResults = resultRows.filter(r => {
        const empDiv = empDivisionMap.get(r.employee_id)
        return empDiv !== undefined && descendantIds.has(empDiv)
      })
      const n = subtreeResults.length
      const suppressed = n === 0

      const workload = suppressed ? null : avg(subtreeResults.map(r => r.score_a))
      const control = suppressed ? null : avg(subtreeResults.map(r => r.score_b))
      const supervisorSupport = suppressed ? null : avg(subtreeResults.map(r => r.score_c))
      const colleagueSupport = suppressed ? null : avg(subtreeResults.map(r => r.score_d))
      const highCount = subtreeResults.filter(r => r.is_high_stress).length
      const highStressRate = suppressed ? null : Math.round((highCount / n) * 1000) / 10
      const healthRisk =
        workload != null && control != null && supervisorSupport != null && colleagueSupport != null
          ? Math.round(((workload + control + supervisorSupport + colleagueSupport) / 4) * 10) / 10
          : null

      groups.push({
        division_id: divId,
        name: div.name,
        tenant_id: user.tenant_id,
        member_count: memberCount,
        high_stress_rate: highStressRate,
        health_risk: healthRisk,
        workload,
        control,
        supervisor_support: supervisorSupport,
        colleague_support: colleagueSupport,
        period_name: period?.title ?? '',
        is_latest: true,
        is_suppressed: suppressed,
        analysis_kind: 'layer' as const,
      })
    }

    // divisions.code（階層コード）でソートし、上位部署が先に並ぶようにする
    groups.sort((a, b) => {
      const codeA = nodeMap.get(a.division_id)?.code ?? ''
      const codeB = nodeMap.get(b.division_id)?.code ?? ''
      return codeA.localeCompare(codeB)
    })

    return { success: true, groups, submittedCountMap }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'データ取得に失敗しました。',
    }
  }
}

// ─────────────────────────────────────────────
// updateImprovementPlan — 職場改善計画のステータス・効果スコアを更新
// ─────────────────────────────────────────────

export type UpdatePlanInput = {
  status?: string
  actual_effect_score?: number | null
}

export type UpdatePlanResult = {
  success: boolean
  error?: string
}

export async function updateImprovementPlan(
  planId: string,
  updates: UpdatePlanInput
): Promise<UpdatePlanResult> {
  try {
    const user = await getServerUser()
    if (!user?.tenant_id) {
      return { success: false, error: '認証されていません。' }
    }

    const supabase = (await createClient()) as any
    const { error } = await supabase
      .from('workplace_improvement_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .eq('tenant_id', user.tenant_id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '更新に失敗しました。',
    }
  }
}
