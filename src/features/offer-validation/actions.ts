"use server";

import { z } from "zod";
import OpenAI from "openai";
import { offerValidationRequestSchema, offerValidationResponseSchema, OfferValidationResponse } from "./schemas";

// OpenAI クライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * SerpApi を利用して、条件に合致する最新の求人相場情報を取得する
 * @param query 検索クエリ
 */
async function fetchCurrentMarketData(query: string): Promise<string> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    console.warn("SERPAPI_API_KEY is not set. Skipping real-time web search.");
    return "リアルタイム検索が利用できないため、一般的な相場感で推測してください。";
  }

  try {
    // google_jobs エンジンを利用（日本の求人もヒットします）
    // hl=ja, gl=jp で日本語環境を指定
    const params = new URLSearchParams({
      engine: "google_jobs",
      q: query,
      hl: "ja",
      gl: "jp",
      api_key: apiKey,
    });

    const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
      method: "GET",
    });

    if (!response.ok) {
      console.error(`SerpApi responded with status: ${response.status}`);
      return "（検索APIエラーのため、一般的な相場感で推測してください）";
    }

    const data = await response.json();
    const jobs = data.jobs_results || [];

    // 上位10件程度の「タイトル、会社名、勤務地、給与情報やスニペット」を抽出
    const extractedInfo = jobs.slice(0, 10).map((job: Record<string, unknown>) => {
      const title = job.title || "不明";
      const company = job.company_name || "不明";
      const location = job.location || "不明";
      
      // 給与情報は description 等から抽出されている場合がある
      const extra: string[] = [];
      if (job.salary) extra.push(`給与例: ${job.salary}`);
      
      // highlights の中に待遇や条件が含まれることがある
      if (Array.isArray(job.job_highlights)) {
        job.job_highlights.forEach((highlight: Record<string, unknown>) => {
          if (Array.isArray(highlight.items)) {
             extra.push(...(highlight.items as string[]));
          }
        });
      }
      
      return `【${title}】企業: ${company}, 勤務地: ${location}\n${extra.join(" / ")}`;
    });

    if (extractedInfo.length === 0) {
      return "該当する求人の検索結果が得られませんでした。";
    }

    return extractedInfo.join("\n\n");
  } catch (error) {
    console.error("Error fetching market data from SerpApi:", error);
    return "（検索API通信エラーのため、一般的な相場感で推測してください）";
  }
}

/**
 * オファー妥当性を検証する Server Action
 * @param formData フロントエンドからの入力データ
 */
export async function validateOfferAction(
  prevState: unknown,
  formData: FormData
): Promise<{ success: boolean; data?: OfferValidationResponse; error?: string }> {
  try {
    // 1. 入力値のパースとバリデーション
    const parsedData = offerValidationRequestSchema.parse({
      jobConditions: formData.get("jobConditions"),
      salary: Number(formData.get("salary")),
      salaryUnit: formData.get("salaryUnit") || "万円",
      location: formData.get("location"),
    });

    const { jobConditions, salary, salaryUnit, location } = parsedData;

    // 2. SerpApi を使って現在の市場求人を検索
    // Google Jobs は検索クエリの工夫が重要（例：「AIエンジニア 東京 求人」）
    const searchQuery = `${jobConditions} ${location} 求人 年収`;
    const marketData = await fetchCurrentMarketData(searchQuery);

    // 3. OpenAI による推論・評価
    const systemPrompt = `
あなたは日本の採用市場および人事領域の専門家です。
ユーザーから「採用の条件」「提示予定の賃金」「勤務地域」が提示されます。
これを、現在市場に出回っている類似求人の最新データ（以下に提示）、およびあなたの持つ日本の採用相場や市況データと照らし合わせ、オファーの競争力・妥当性を評価してください。

【現在の類似求人市場データ（SerpApi検索結果）】
${marketData}

【評価の観点と出力形式】
必ず以下の構造を持つ厳密なJSON形式で出力してください。JSONブロック外のテキストは含めないでください。
{
  "score": (数値) このオファーの競争力を 1 (極めて低い) から 5 (極めて高い) の5段階で評価,
  "comment": "(文字列) 市場平均・相場と比較して、給与設定や条件面がどうであるかを具体的にコメント。高すぎる・安すぎる・この条件ならもう少し年収を上げるべき等のアドバイス",
  "summary": "(文字列) このオファーで採用を成功させられるか、簡潔な総評",
  "recommendedSites": [
    { 
      "name": "(文字列) 採用サイト名", 
      "url": "URLまたは空文字", 
      "reason": "(文字列) その媒体を選ぶべき理由" 
    }
  ]
}

※ \`recommendedSites\` についての重要指示：
- ビズリーチやGreenなどの特化型・ハイクラス向けサイトだけでなく、**ハローワーク、Indeed、求人ボックスなどの無料媒体や、一般的な総合求人サイト（Doda, リクナビ等）**も含め、ターゲット層に合致する媒体を幅広く最低3〜4つ提案してください。一部の特定サイトに偏らないように注意してください。
- 提案する各媒体の \`url\` は、**必ず正確な公式URL（例：ハローワークは https://www.hellowork.mhlw.go.jp/ ）**を指定してください。正確なURLが不明な場合は、実在しないURLを捏造せず、空文字（""）を設定してください。
`;

    const userPrompt = `
【今回のオファー条件】
- 求める条件・職種: ${jobConditions}
- 提示賃金: ${salary}${salaryUnit}
- 勤務地域: ${location}

上記オファーの妥当性を評価し、JSON形式で返答してください。
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error("AIからの応答の解析に失敗しました。");
    }

    const parsedJson = JSON.parse(responseContent);
    const result = offerValidationResponseSchema.parse(parsedJson);

    return { success: true, data: result };

  } catch (error: unknown) {
    console.error("Validation Action Error:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message || "入力値のエラー" };
    }
    const err = error as Error;
    return { success: false, error: err.message || "予期せぬエラーが発生しました。" };
  }
}
