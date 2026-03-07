'use server';

/**
 * TalentDraft AI — Server Actions
 *
 * OpenAI API (gpt-4o) を使って求人コンテンツを自動生成し、
 * recruitment_jobs テーブルへ保存する。
 */

import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth/server-user';
import type { AiGenerationResult } from './types';

// ─────────────────────────────────────────────
// 入力フォームの型
// ─────────────────────────────────────────────
export interface GenerateJobInput {
  /** 採用で解決したい課題 */
  challenge: string;
  /** 候補者に期待すること */
  expectations: string;
  /** 自社のユニークな点・魅力 */
  uniquePoints: string;
}

// ─────────────────────────────────────────────
// System Prompt（日本の採用市場に最適化）
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `あなたは日本の採用市場に精通したプロフェッショナルな採用コピーライターです。
以下のルールを厳守してください：

【コンテンツルール】
- 日本のビジネス慣習・敬語表現を正しく使用すること
- 性別・年齢・国籍・障害等による差別的な表現を絶対に含めないこと（男女雇用機会均等法・職業安定法に準拠）
- 「若手歓迎」「体力のある方」等の間接差別表現も避けること
- 具体的かつ魅力的な表現を心がけ、抽象的・テンプレート的な文言を避けること。出力の都度、独自の表現・切り口を取り入れ、毎回同じような定型文にならないよう柔軟な表現で回答してください。
- 会社の独自性や成長機会を効果的にアピールすること
- 予算のない中小企業がメインターゲットです。「高い媒体を強制されている」という不信感を与えないよう、ユーザーのペインに寄り添う優しく誠実なトーン＆マナーで回答してください。

【媒体知識（厳格な定義・ミスマッチ禁止）】
以下の媒体特性を正確に理解し、ミスマッチな提案は絶対に行わないでください。
- Green: 「IT・Web業界のエンジニア・デザイナー」専門媒体。経理や営業など、非IT職種には"絶対に"提案しないこと。
- MS-Japan等の特化型: 経理・人事・法務などのバックオフィス（管理部門）のプロフェッショナル向け媒体。
- ビズリーチ: 年収600万以上の管理職・ハイクラス向け（全業種）。ジュニア層や未経験には適さない。
- Indeed / 求人ボックス: 幅広い職種に対応。特に地元採用、未経験、工場・現場系、低コストで募集をかけたい場合に強く推奨。
- ハローワーク: 地元密着、事務職、未経験、ブルーカラー向け。完全無料であり、予算がない場合に最適。

【推論プロセスと判定ロジック（Chain of Thought）】
掲載メディアを提案するにあたり、必ず以下のステップで思考し、出力ルールを分岐させてください。
1. 入力された情報（課題、期待すること等）から、「職種（ITか、現場か等）」と「ターゲット層（ハイエンドか、未経験か）」を分析する。
2. その求人が「有料スカウト媒体が必須レベル（ハイキャリア・超専門職など）」か、「無料媒体でも充分戦える」かを判定する。
3. 判定結果に基づき、以下の出力パターン（パターンA または パターンB）を厳格に適用する。

【出力パターンルール】
■ パターンA：「有料スカウト媒体が適している」と判定した場合
予算がある企業とない企業の両方に配慮した提案を行います。
- scoutText 内: 【推奨：スカウト用メッセージ】として手紙形式の文面を出力後、改行し（\n\n等を活用）、【予算を抑えたい場合：無料媒体用・求人原稿】としてコピペ用の募集要項（業務内容、魅力など）を出力する。
- mediaAdvice 内: 【推奨媒体】として有料媒体（ビズリーチ, Green等）とその理由を提示後、改行し、【代替案】として「採用難易度は上がりますが（または確率は下がりますが）、無料で進める場合はIndeedやハローワークの活用を…」といった配慮のあるアドバイスを出力する。

■ パターンB：「無料媒体で充分」と判定した場合
最初から無料媒体向けの提案のみを行います。
- scoutText 内: スカウト形式（手紙形式）は出力せず、【無料媒体用・求人原稿】として、そのままIndeedやハローワークにコピペできる募集要項の形式のみを出力する。
- mediaAdvice 内: Indeed、ハローワーク、求人ボックスなどの無料媒体を強く推奨し、その理由を出力する。

【出力形式】
必ず以下の JSON 形式で出力してください。プロパティの値はすべて単一の「文字列（String）」として出力し、配列やオブジェクトを含めないでください。JSON以外のテキストは一切含めないこと。マークダウンの記法（**太字** など）や見出しを活用して美しくフォーマットしてください。
{
  "catchphrase": "キャッチコピー（100文字以内の魅力的な一文）",
  "scoutText": "採用文面（上記パターンのルールに従い、スカウト文・求人原稿を出し分けて記載）",
  "interviewGuide": "面接質問ガイド（5つの質問と各質問の評価ポイントを改行を含めた1つのテキストとして記載）",
  "mediaAdvice": "掲載メディア・アドバイス（上記パターンのルールに従い、中小企業に寄り添うトーンで記載）"
}`;

// ─────────────────────────────────────────────
// generateJobContent — AI求人コンテンツ生成
// ─────────────────────────────────────────────
export async function generateJobContent(
  input: GenerateJobInput
): Promise<{ success: boolean; data?: AiGenerationResult; error?: string }> {
  try {
    // 1. 認証チェック
    const user = await getServerUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: '認証されていません。ログインしてください。' };
    }

    // 1.5 プラン・利用回数チェック
    const usage = await getMonthlyUsageCount();
    if (!usage.isUnlimited && usage.count >= usage.max) {
      return { success: false, error: '今月のAI無料利用チケット（10回）の上限に達しました。無制限でご利用いただくにはProプランへのアップグレードをご検討ください。' };
    }

    // 2. OpenAI API キー確認
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.includes('xxxxxxxx')) {
      return { success: false, error: 'OpenAI API キーが設定されていません。管理者にお問い合わせください。' };
    }

    // 3. 入力バリデーション
    if (!input.challenge?.trim() || !input.expectations?.trim() || !input.uniquePoints?.trim()) {
      return { success: false, error: 'すべての質問に回答してください。' };
    }

    // 4. OpenAI API 呼び出し
    const userPrompt = `以下の情報をもとに、求人コンテンツを生成してください。

【採用で解決したい課題】
${input.challenge.trim()}

【候補者に期待すること】
${input.expectations.trim()}

【自社のユニークな点・魅力】
${input.uniquePoints.trim()}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TalentDraft AI] OpenAI API error:', errorText);
      return { success: false, error: 'AI生成中にエラーが発生しました。しばらくしてからお試しください。' };
    }

    const completion = await response.json();
    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'AIからの応答が空でした。' };
    }

    // 5. JSON パース
    let parsed: AiGenerationResult;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('[TalentDraft AI] JSON parse error:', content);
      return { success: false, error: 'AI出力の解析に失敗しました。' };
    }

    // 6. コンテンツ生成結果（全プラン共通化：フルオープン）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formatValue = (val: any): string => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) {
        return val.map(v => typeof v === 'object' && v !== null ? Object.entries(v).map(([key, value]) => `【${key}】 ${value}`).join('\n') : String(v)).join('\n\n');
      }
      if (typeof val === 'object' && val !== null) {
        return Object.entries(val).map(([key, value]) => `【${key}】 ${value}`).join('\n');
      }
      return String(val);
    };

    const result: AiGenerationResult = {
      catchphrase: formatValue(parsed.catchphrase),
      scoutText: formatValue(parsed.scoutText),
      interviewGuide: formatValue(parsed.interviewGuide),
      mediaAdvice: formatValue(parsed.mediaAdvice),
    };

    // 7. DB に保存
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbError } = await (supabase as any)
      .from('recruitment_jobs')
      .insert({
        tenant_id: user.tenant_id,
        title: parsed.catchphrase?.substring(0, 100) || '未設定',
        description: input.challenge,
        requirements: input.expectations,
        ai_catchphrase: parsed.catchphrase,
        ai_scout_text: parsed.scoutText,
        ai_interview_guide: parsed.interviewGuide,
        media_advice: parsed.mediaAdvice,
        created_by: user.id,
        status: '下書き',
      });

    if (dbError) {
      console.error('[TalentDraft AI] DB insert error:', dbError);
      // DB保存失敗でもAI結果は返す
    }
    
    // 8. ai_usage_logs に利用履歴を記録
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: logError } = await (supabase as any)
      .from('ai_usage_logs')
      .insert({
        tenant_id: user.tenant_id,
        feature_name: 'talent-draft',
      });
      
    if (logError) {
      console.error('[TalentDraft AI] DB insert ai_usage_logs error:', logError);
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('[TalentDraft AI] Unexpected error:', error);
    return { success: false, error: '予期せぬエラーが発生しました。' };
  }
}

// ─────────────────────────────────────────────
// getMonthlyUsageCount — 今月の利用回数取得
// ─────────────────────────────────────────────
export async function getMonthlyUsageCount(): Promise<{
  count: number;
  max: number;
  isUnlimited: boolean;
}> {
  const user = await getServerUser();
  if (!user || !user.tenant_id) {
    return { count: 0, max: 10, isUnlimited: false };
  }

  const isPro = user.planType === 'pro' || user.planType === 'enterprise';
  if (isPro) {
    return { count: 0, max: 10, isUnlimited: true };
  }

  const supabase = await createClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count, error } = await (supabase as any)
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', user.tenant_id)
    .eq('feature_name', 'talent-draft')
    .gte('created_at', startOfMonth.toISOString());

  if (error) {
    console.error('[TalentDraft AI] usage logs fetch error:', error);
  }

  return { count: count || 0, max: 10, isUnlimited: false };
}

// ─────────────────────────────────────────────
// getRecruitmentAiLogs — AI求人メーカーの生成履歴を取得 (Pro限定)
// ─────────────────────────────────────────────
export async function getRecruitmentAiLogs() {
  const user = await getServerUser();
  if (!user || !user.tenant_id) {
    return { success: false, error: '認証されていません。', data: [] };
  }

  // 権限チェック（Pro または Enterprise のみアクセス可）
  const isPro = user.planType === 'pro' || user.planType === 'enterprise';
  if (!isPro) {
    // サーバーサイドで厳密に遮断し、データは絶対に返さない
    return { success: false, error: '過去の生成データを利用・管理するには、Proプランへのアップグレードが必要です。', data: [] };
  }

  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('recruitment_jobs')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[TalentDraft AI] fetch logs error:', error);
    return { success: false, error: '履歴の取得に失敗しました。', data: [] };
  }

  return { success: true, data };
}
