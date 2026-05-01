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
- 例：「1on1ミーティングの定期化」「業務負荷の可視化と優先順位付けのルール化」「休憩スペースの整備」`;

// ─────────────────────────────────────────────
// generateAIProposals — 集団分析からAI提案を3件生成
// ─────────────────────────────────────────────

export async function generateAIProposals(): Promise<GenerateProposalsResult> {
  try {
    const user = await getServerUser()
    if (!user?.tenant_id) {
      return { success: false, error: '認証されていません。ログインしてください。' }
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey.includes('xxxxxxxx')) {
      return { success: false, error: 'OpenAI API キーが設定されていません。管理者にお問い合わせください。' }
    }

    // 集団分析データを取得（最新期間のみ）
    const { getGroupAnalysis } = await import('@/features/adm/stress-check/queries')
    const groups = await getGroupAnalysis(user.tenant_id, true)

    if (!groups || groups.length === 0) {
      return { success: false, error: '集団分析データがありません。ストレスチェックの集団分析を先に実施してください。' }
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

    const userPrompt = `以下のストレスチェック集団分析結果を基に、職場改善提案を3件生成してください。

【集団分析データ】\n${JSON.stringify(analysisSummary, null, 2)}`

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
            userMessage = 'OpenAI API キーが無効です。.env.local の OPENAI_API_KEY を確認してください。'
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
      priority: ['高', '中', '低'].includes(p.priority) ? p.priority : '中' as const,
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
        ]),
      )
      sourceDivisionEstablishmentId = resolveEstablishmentIdForDivision(
        proposal.division_id,
        user.tenant_id,
        (anchorRows ?? []) as { division_establishment_id: string; division_id: string }[],
        divisionsById,
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
