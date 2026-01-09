import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORSヘッダー設定
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // ブラウザからのPreflightリクエスト(OPTIONS)への応答
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. 環境変数の取得とチェック
    const serpApiKey = Deno.env.get('SERPAPI_KEY')
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!serpApiKey || !geminiKey) {
      console.error("Error: API Keys missing. SerpApi:", !!serpApiKey, "Gemini:", !!geminiKey)
      throw new Error('Server configuration error: API Keys missing')
    }

    // 2. リクエストボディの取得
    const { role, location, level, salary_min, salary_max, tags } = await req.json()
    console.log(`[Request] Role: ${role}, Location: ${location}`)

    // 3. ユーザー認証 (Supabase Auth)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized: User check failed')

    // 4. SerpApi 検索 (Google検索)
    const query = `${location} ${role} 求人 年収`
    console.log(`[SerpApi] Searching for: ${query}`)
    
    const searchRes = await fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${serpApiKey}&gl=jp&hl=ja`)
    const searchData = await searchRes.json()
    
    if (searchData.error) {
        console.error("[SerpApi] Error:", searchData.error)
        throw new Error(`SerpApi failed: ${searchData.error}`)
    }

    // 上位3件の結果を抽出
    const marketContext = searchData.organic_results?.slice(0, 3).map((r: any) => 
      `- ${r.title}: ${r.snippet}`
    ).join('\n') || "検索結果なし"
    
    console.log("[SerpApi] Context retrieved. Length:", marketContext.length)

    // 5. Gemini API 呼び出し (v1beta / gemini-1.5-flash)
   // 変更後（これに書き換えてください）
const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    
    const prompt = `
      あなたはプロの人事コンサルタントAIです。以下の求人オファーの妥当性を診断してください。
      
      【あなたのオファー】
      - 職種: ${role} (${level})
      - 勤務地: ${location}
      - 年収提示: ${salary_min}万 ~ ${salary_max}万
      - 特徴: ${tags?.join(', ') || 'なし'}

      【市場データ (Google検索結果)】
      ${marketContext}

      以下のJSON形式のみで回答してください。Markdownのコードブロック(backticks)は含めないでください。
      {
        "score": "S, A, B, Cのいずれか",
        "market_avg_min": 数値(万円),
        "market_avg_max": 数値(万円),
        "advice": "具体的なアドバイス(100文字以内)",
        "competitor_trend": "競合の傾向(一言)"
      }
    `

    console.log("[Gemini] Calling API...")
    
    const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    })

    const geminiData = await geminiRes.json()
    
    if (geminiData.error) {
        console.error("[Gemini] API Error Response:", JSON.stringify(geminiData.error))
        throw new Error(`Gemini API failed: ${geminiData.error.message}`)
    }

    // レスポンスの解析 (Markdown除去処理を含む)
    let rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
    if (!rawText) throw new Error('Gemini returned empty response')
    
    // ```json ... ``` を削除して純粋なJSON文字列にする
    rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
    
    console.log("[Gemini] Response received.")
    
    let resultJson
    try {
        resultJson = JSON.parse(rawText)
    } catch (e) {
        console.error("[Gemini] JSON Parse Error. Raw text:", rawText)
        // パースエラー時のフォールバック
        resultJson = {
            score: "E",
            market_avg_min: 0,
            market_avg_max: 0,
            advice: "AIからの回答形式が不正でしたが、処理は完了しました。",
            competitor_trend: "不明"
        }
    }

    // 6. DB保存 (履歴)
    const { error: dbError } = await supabaseClient.from('offer_diagnoses').insert({
        created_by: user.id,
        job_role: role,
        location,
        level,
        salary_min,
        salary_max,
        tags,
        result_data: resultJson
    })
    
    if (dbError) {
        console.error("[DB] Insert Error:", dbError)
    } else {
        console.log("[DB] Diagnosis saved successfully.")
    }

    // 7. クライアントへ返却
    return new Response(JSON.stringify(resultJson), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error("[Function Error]", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})