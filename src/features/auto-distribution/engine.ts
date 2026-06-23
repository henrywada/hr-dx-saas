import { z } from 'zod'
import { generateGeminiContent, GEMINI_FLASH_MODEL } from '@/lib/ai/gemini'
import { sendMail } from '@/lib/mail/send'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AutoDistributionRule,
  DistributionArticle,
  ExecuteRuleResult,
  TriggeredBy,
} from './types'

interface SerpApiResult {
  title?: string
  link?: string
  snippet?: string
  date?: string
}

/**
 * 検索テーマ（日本語）を英語の検索クエリへ翻訳する。
 * 欧米の外国語サイトをメインに検索するため、英語クエリで検索する。
 */
async function translateThemeToEnglishQuery(theme: string): Promise<string> {
  const responseContent = await generateGeminiContent({
    model: GEMINI_FLASH_MODEL,
    system:
      'あなたは検索クエリの翻訳アシスタントです。与えられた日本語の検索テーマを、Google検索で欧米の英語記事を見つけるための簡潔な英語の検索クエリに翻訳してください。検索クエリの文字列のみを出力し、説明や引用符は含めないでください。',
    prompt: theme,
    temperature: 0,
  })
  return responseContent.trim()
}

/**
 * SerpAPI（Google検索エンジン）でテーマに関連する記事を検索する。
 * 欧米の外国語情報をメインに収集するため、テーマを英語に翻訳したクエリで
 * 米国リージョン・英語インターフェースを指定して検索する。
 * target_urls 指定時は site: 演算子で対象ドメインに絞り込む。
 */
async function searchArticles(
  theme: string,
  targetUrls: string[] | null,
  maxArticles: number
): Promise<SerpApiResult[]> {
  const apiKey = process.env.SERPAPI_API_KEY
  if (!apiKey) {
    throw new Error('SERPAPI_API_KEY が設定されていません')
  }

  const englishQuery = await translateThemeToEnglishQuery(theme)

  const siteFilter =
    targetUrls && targetUrls.length > 0
      ? '(' + targetUrls.map(url => `site:${new URL(url).hostname}`).join(' OR ') + ') '
      : ''
  const query = `${siteFilter}${englishQuery}`.trim()

  const url = new URL('https://serpapi.com/search.json')
  url.searchParams.set('engine', 'google')
  url.searchParams.set('q', query)
  url.searchParams.set('hl', 'en')
  url.searchParams.set('gl', 'us')
  url.searchParams.set('num', String(Math.min(maxArticles, 50)))
  url.searchParams.set('api_key', apiKey)

  const response = await fetch(url.toString(), { method: 'GET' })
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SerpApi error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const results: SerpApiResult[] = data.organic_results ?? []
  return results.slice(0, maxArticles)
}

const articleSummarySchema = z.object({
  title: z.string(),
  summary: z.string(),
  ai_opinion: z.string(),
})
const summaryResponseSchema = z.object({
  articles: z.array(articleSummarySchema),
})

/**
 * Gemini で検索結果（英語記事が中心）を日本語に翻訳・要約し、
 * 記事ごとのタイトル・概要記事・AIの意見を生成する。
 * 検索結果の順序を保ったまま、各記事に title / summary / ai_opinion を付与する。
 */
async function summarizeArticles(
  results: SerpApiResult[],
  theme: string
): Promise<DistributionArticle[]> {
  if (results.length === 0) return []

  const systemPrompt = `あなたは人事・経営情報の調査アシスタントです。与えられた検索結果一覧（主に英語などの外国語記事）を読み、各記事について以下の3点を日本語で生成してください。原文が外国語の場合は内容を日本語に翻訳した上でまとめてください。
1. title: 記事の内容が具体的に分かる見出し（検索テーマの繰り返しではなく、その記事固有の内容を表すタイトル）
2. summary: 記事で書かれている情報をまとめた概要記事（4〜6文程度で、記事の要点・背景・結論が分かるように記述する）
3. ai_opinion: この記事についてのAIの意見・所感を1〜2文で

必ず以下の構造を持つ厳密なJSON形式で出力してください。JSONブロック外のテキストは含めないでください。記事数・順序は入力と同じにしてください。
{
  "articles": [
    { "title": "(文字列)", "summary": "(文字列)", "ai_opinion": "(文字列)" }
  ]
}`

  const userPrompt = `検索テーマ: ${theme}\n\n検索結果一覧:\n${results
    .map(
      (r, i) =>
        `${i + 1}. タイトル: ${r.title ?? '(不明)'}\n概要: ${r.snippet ?? ''}\nURL: ${r.link ?? ''}`
    )
    .join('\n\n')}`

  const responseContent = await generateGeminiContent({
    model: GEMINI_FLASH_MODEL,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.4,
    json: true,
  })

  const parsed = summaryResponseSchema.parse(JSON.parse(responseContent))

  return results.map((r, i) => ({
    published_at: r.date ?? new Date().toISOString(),
    title: parsed.articles[i]?.title ?? r.title ?? '',
    summary: parsed.articles[i]?.summary ?? '',
    source_url: r.link ?? '',
    ai_opinion: parsed.articles[i]?.ai_opinion ?? '',
  }))
}

/** 配信メールのHTML本文を構築する */
function buildDigestEmailHtml(
  rule: Pick<AutoDistributionRule, 'name' | 'search_theme'>,
  articles: DistributionArticle[]
): string {
  const rows = articles
    .map(
      a => `
<tr>
  <td style="padding:12px;border-bottom:1px solid #e2e6ec;">
    <div style="color:#8a94a6;font-size:12px;">${a.published_at}</div>
    <div style="font-weight:bold;margin:4px 0;">${a.title}</div>
    <div style="margin:4px 0;">${a.summary}</div>
    <div style="margin:4px 0;"><a href="${a.source_url}">${a.source_url}</a></div>
    <div style="margin:4px 0;color:#FD7601;">AIの意見: ${a.ai_opinion}</div>
  </td>
</tr>`
    )
    .join('')

  return `<p>自動配信ルール「${rule.name}」の検索結果をお届けします。</p>
<p>検索テーマ: ${rule.search_theme}</p>
<table border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;">${rows}</table>
<p>本メールはHR-DX 自動配信ルールにより自動送信されています。</p>`
}

/**
 * 配信ルールを1件実行する（検索 → 要約 → 送信 → ログ記録）。
 * cron API route と Server Action（テスト実行）の両方から呼ばれる共通ロジック。
 */
export async function executeRule(
  supabase: SupabaseClient,
  rule: AutoDistributionRule,
  triggeredBy: TriggeredBy
): Promise<ExecuteRuleResult> {
  let articles: DistributionArticle[] = []
  let status: ExecuteRuleResult['status'] = 'success'
  let errorMessage: string | undefined

  try {
    const searchResults = await searchArticles(
      rule.search_theme,
      rule.target_urls,
      rule.max_articles
    )
    articles = await summarizeArticles(searchResults, rule.search_theme)

    if (articles.length > 0) {
      await Promise.all(
        rule.recipient_emails.map(to =>
          sendMail({
            to,
            subject: `【HR-DX】自動配信レポート: ${rule.name}`,
            html: buildDigestEmailHtml(rule, articles),
          })
        )
      )
    } else {
      status = 'partial'
      errorMessage = '検索結果が0件のため、配信をスキップしました。'
    }
  } catch (error) {
    console.error(`executeRule error (rule: ${rule.id}):`, error)
    status = 'failed'
    errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました'
  }

  const { error: logError } = await supabase.from('auto_distribution_logs').insert({
    tenant_id: rule.tenant_id,
    rule_id: rule.id,
    status,
    article_count: articles.length,
    articles,
    error_message: errorMessage ?? null,
    triggered_by: triggeredBy,
  })
  if (logError) {
    console.error(`auto_distribution_logs insert error (rule: ${rule.id}):`, logError)
  }

  return {
    success: status !== 'failed',
    status,
    articleCount: articles.length,
    errorMessage,
  }
}

/** JST基準で「今日」が実行対象日かどうかを判定する */
export function isDueTodayJst(
  rule: Pick<
    AutoDistributionRule,
    'schedule_type' | 'schedule_day_of_week' | 'schedule_day_of_month'
  >,
  now: Date = new Date()
): boolean {
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)

  if (rule.schedule_type === 'weekly') {
    return jstNow.getUTCDay() === rule.schedule_day_of_week
  }

  const dayOfMonth = jstNow.getUTCDate()
  const lastDayOfMonth = new Date(
    Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth() + 1, 0)
  ).getUTCDate()
  // 31日指定で当月が31日未満の場合は月末日に実行する
  const targetDay = Math.min(rule.schedule_day_of_month ?? 1, lastDayOfMonth)
  return dayOfMonth === targetDay
}
