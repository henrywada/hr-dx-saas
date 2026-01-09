// 修正前
// import { createClient } from 'jsr:@supabase/supabase-js@2'

// 修正後 (Denoで確実に動くURLインポートに変更)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Authentication & Tenant Retrieval
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { data: tenantId, error: tenantError } = await supabaseClient.rpc('get_my_tenant_id')
    if (tenantError) throw new Error('Failed to retrieve tenant ID')

    // 2. Environment Variables Check
    const serpApiKey = Deno.env.get('SERPAPI_KEY')
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!serpApiKey || !geminiApiKey) {
        throw new Error('API Key missing (SERPAPI_KEY or GEMINI_API_KEY)')
    }

    // 3. Parse Input
    const { role, location, level, salary_min, salary_max, tags } = await req.json()

    // 4. Search (SerpApi)
    let searchContext = ""
    try {
        const query = `"${location}" "${role}" 求人 年収`
        const resp = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${serpApiKey}`)
        const data = await resp.json()
        
        if (data.organic_results && Array.isArray(data.organic_results)) {
            searchContext = data.organic_results
                .slice(0, 3)
                .map((r: any) => `- Title: ${r.title}\n  Snippet: ${r.snippet}`)
                .join('\n')
        }
    } catch (e) {
        console.error('SerpApi Error:', e)
        searchContext = "検索エラーにより競合情報を取得できませんでした。"
    }

    // 5. AI Diagnosis (Gemini API)
    const prompt = `
あなたはプロの採用コンサルタントです。以下の求人条件と、Google検索で得られた競合の求人情報を分析し、このオファーの競争力を診断してください。

## 求人条件
- 職種: ${role}
- 勤務地: ${location}
- 想定レベル: ${level}
- 提示年収: ${salary_min}万円 〜 ${salary_max}万円
- 特徴: ${tags ? tags.join(', ') : 'なし'}

## 競合の検索結果 (参考)
${searchContext}

## 出力フォーマット
以下のJSON形式のみを出力してください。Markdownのコードブロックは不要です。
{
    "score": "A", // A: 非常に競争力がある (上位20%), B: 平均的 (妥当), C: 競争力が低い (見直し推奨)
    "market_avg_min": 数値, // エリア・職種の平均的な年収下限 (万円)
    "market_avg_max": 数値, // エリア・職種の平均的な年収上限 (万円)
    "advice": "具体的な改善アドバイスや評価コメント (100文字程度)",
    "competitor_trend": "競合他社の傾向 (検索結果に基づく)"
}
    `

    const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    })

    if (!geminiResp.ok) {
        const err = await geminiResp.text()
        throw new Error(`Gemini API Error: ${err}`)
    }

    const geminiData = await geminiResp.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) throw new Error('Gemini API returned no content')

    // Clean up JSON string (remove markdown blocks if present)
    const jsonString = rawText.replace(/```json\n?|\n?```/g, '').trim()
    
    let diagnosisResult
    try {
        diagnosisResult = JSON.parse(jsonString)
    } catch (e) {
        console.error('JSON Parse Error:', e, rawText)
        throw new Error('Failed to parse AI response')
    }

    // 6. Save to Database
    const { error: dbError } = await supabaseClient
        .from('offer_diagnoses')
        .insert({
            tenant_id: tenantId,
            target_role: role,
            target_location: location,
            salary_min,
            salary_max,
            diagnosis_result: diagnosisResult,
        })
    
    if (dbError) {
        console.error("DB Insert Error:", dbError)
    }

    // 7. Response
    return new Response(
      JSON.stringify(diagnosisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("Function Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
