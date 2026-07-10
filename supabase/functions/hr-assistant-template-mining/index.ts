import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const MODEL = 'google/gemini-2.5-flash'
const MIN_QUESTIONS = 5

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY') ?? ''
    if (!openRouterKey) throw new Error('OPENROUTER_API_KEY が未設定です')

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

    const { data: messages, error } = await supabase
      .from('tenant_hr_assistant_messages')
      .select('tenant_id, content, mode')
      .eq('role', 'user')
      .gte('created_at', since)
      .limit(5000)

    if (error) throw error

    const byTenant = new Map<string, { content: string; mode: string }[]>()
    for (const m of messages ?? []) {
      const tid = m.tenant_id as string
      if (!tid) continue
      const list = byTenant.get(tid) ?? []
      list.push({ content: m.content as string, mode: (m.mode as string) || 'general' })
      byTenant.set(tid, list)
    }

    let tenantsProcessed = 0
    let templatesCreated = 0
    const errors: string[] = []
    const topicSuggestions: { topic: string; count: number }[] = []
    const topicCounts = new Map<string, number>()

    for (const [tenantId, qs] of byTenant) {
      if (qs.length < MIN_QUESTIONS) continue
      tenantsProcessed++

      const sample = qs.slice(0, 40).map(q => `- [${q.mode}] ${q.content}`).join('\n')
      try {
        const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://app.hr-dx.jp',
            'X-Title': 'HR-DX template-mining',
          },
          body: JSON.stringify({
            model: MODEL,
            temperature: 0.2,
            max_tokens: 2000,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content:
                  '人事向け質問テンプレートを生成する。固有名詞・個人情報・会社名を除去し汎用化する。' +
                  'JSON: {"templates":[{"mode":"general"|"labor_calc"|"comment_review"|"case_search","question_text":string}],' +
                  '"themes":[string]}。templates は 5〜10 件。',
              },
              { role: 'user', content: `直近の質問一覧:\n${sample}` },
            ],
          }),
        })
        if (!res.ok) {
          errors.push(`${tenantId}: OpenRouter ${res.status}`)
          continue
        }
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content ?? '{}'
        const parsed = JSON.parse(text) as {
          templates?: { mode?: string; question_text?: string }[]
          themes?: string[]
        }

        for (const t of parsed.templates ?? []) {
          if (!t.question_text || !t.mode) continue
          const { error: upErr } = await supabase.from('tenant_hr_assistant_templates').insert({
            tenant_id: tenantId,
            mode: t.mode,
            question_text: t.question_text.slice(0, 200),
            source: 'mined',
            usage_count: 0,
            status: 'active',
          })
          if (!upErr) templatesCreated++
        }

        for (const theme of parsed.themes ?? []) {
          topicCounts.set(theme, (topicCounts.get(theme) ?? 0) + 1)
        }
      } catch (e) {
        errors.push(`${tenantId}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    for (const [topic, count] of topicCounts) {
      topicSuggestions.push({ topic, count })
    }
    topicSuggestions.sort((a, b) => b.count - a.count)

    // SaaS 向けに提案をログ出力（自動上書きしない）
    if (topicSuggestions.length > 0) {
      console.log('[template-mining] topic suggestions', JSON.stringify(topicSuggestions.slice(0, 20)))
    }

    return new Response(
      JSON.stringify({
        success: true,
        tenantsProcessed,
        templatesCreated,
        topicSuggestions: topicSuggestions.slice(0, 20),
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
