import { NextResponse } from 'next/server';

// タイムアウト設定（Vercel等のデフォルト制限対策）
export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    // 1. フロントエンドからデータを受け取る
    const { role, location, salary_min, salary_max, tags, level } = await req.json();

    const geminiKey = process.env.GEMINI_API_KEY;
    const serpApiKey = process.env.SERPAPI_KEY;

    // 鍵がない場合はエラー
    if (!geminiKey || !serpApiKey) {
      console.error("API Keys missing in .env.local");
      return NextResponse.json({ error: 'Server misconfiguration: API Keys missing' }, { status: 500 });
    }

    // 2. Google検索 (SerpApi)
    console.log(`[Local API] Searching for: ${location} ${role}`);
    const query = `${location} ${role} 求人 年収`;
    const searchRes = await fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&api_key=${serpApiKey}&gl=jp&hl=ja`);
    const searchData = await searchRes.json();

    if (searchData.error) {
      throw new Error(`SerpApi failed: ${searchData.error}`);
    }

    // 検索結果を整形
    const marketContext = searchData.organic_results?.slice(0, 3).map((r: any) =>
      `- ${r.title}: ${r.snippet}`
    ).join('\n') || "検索結果なし";

    // 3. Gemini API 呼び出し (モデル: gemini-2.5-flash)
    console.log("[Local API] Calling Gemini...");
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
        "competitor_trend": "競合の傾向(一言)",
        "effective_media": [{ "name": "媒体名", "url": "WebサイトのURL" }]
      }
    `;

    const aiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const aiData = await aiRes.json();
    
    // 4. レスポンス解析
    let resultJson;
    try {
      const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      // 余計な記号を削除してJSON化
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      resultJson = JSON.parse(cleanedText);
    } catch (e) {
      console.error("[Local API] JSON Parse Error", e);
      // エラー時のフォールバックデータ
      resultJson = {
        score: "E",
        market_avg_min: 0,
        market_avg_max: 0,
        advice: "AI解析エラーが発生しましたが、処理は完了しました。",
        competitor_trend: "不明",
        effective_media: [
          { name: "Indeed", url: "https://jp.indeed.com/" },
          { name: "LinkedIn", url: "https://www.linkedin.com/" },
          { name: "Green", url: "https://www.green-japan.com/" },
          { name: "Wantedly", url: "https://www.wantedly.com/" },
          { name: "X (Twitter)", url: "https://twitter.com/" }
        ]
      };
    }

    return NextResponse.json(resultJson);

  } catch (error: any) {
    console.error("[Local API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}