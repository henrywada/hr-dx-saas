import type { ResearchDocument } from '../types'

/**
 * 要約の出力トークン上限。
 * 既定モデル google/gemini-2.5-flash は Gemini 2.5 系で thinking が既定 ON のため、
 * openRouterChat の既定値 2000 では thinking に食われて要約が途中終了しうる。
 * reasoning.exclude と併用しつつ、上限自体も引き上げておく。
 */
export const SUMMARY_MAX_TOKENS = 4000

/** プロンプトに載せる本文の最大文字数。これを超えた分は切り捨てる */
const MAX_BODY_CHARS = 30000

/**
 * 要約の system プロンプト。
 * ハルシネーションを構造的に防ぐため、入力された原文の外へ出ることを禁じる。
 */
export function buildSummarySystemPrompt(): string {
  return [
    'あなたは日本の人事実務者を補助するアシスタントです。',
    'ユーザーから与えられた法令・通達・裁決事例の原文を要約することだけが役割です。',
    '',
    '厳守事項:',
    '1. 与えられた原文のみを根拠に要約してください。原文に無いことは一切書かないでください。',
    '2. 検索をしてはいけません。あなたの知識から補足してもいけません。推測で補ってもいけません。',
    '3. 原文から判断できない場合は「原文からは判断できません」と明記してください。',
    '4. 条番号・通達番号・日付は、原文の表記をそのまま転記してください。言い換えないでください。',
    '5. 法的な助言や、適用可否の断定をしてはいけません。原文が何を定めているかの説明にとどめてください。',
    '',
    '出力形式:',
    '- 冒頭に3行以内の概要',
    '- その後に「要点」として箇条書き（最大7項目）',
    '- 日本語で書いてください',
  ].join('\n')
}

/** 要約対象の原文を user プロンプトへ整形する */
export function buildSummaryUserPrompt(doc: ResearchDocument): string {
  const truncated =
    doc.body.length > MAX_BODY_CHARS
      ? `${doc.body.slice(0, MAX_BODY_CHARS)}\n\n（以下略：原文が長いため途中までを掲載しています）`
      : doc.body

  return [
    `【タイトル】${doc.title}`,
    doc.identifier ? `【番号】${doc.identifier}` : '',
    `【出典】${doc.sourceUrl}`,
    `【取得日時】${doc.fetchedAt}`,
    '',
    '【原文】',
    truncated,
  ]
    .filter(line => line !== '')
    .join('\n')
}
