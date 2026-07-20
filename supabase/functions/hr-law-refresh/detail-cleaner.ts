/**
 * 要約プロンプトのチェック項目が detail の見出しとして出力される事象への保険。
 * プロンプト側でも禁止しているが、モデルが従わない場合に備えて保存前に除去する。
 *
 * src/features/hr-assistant/law-detail-cleaner.ts と同一ロジック
 * （Deno Edge Function は src/ を import できないため個別に保持する）。
 */

/** 要約プロンプト由来で、全文書に共通して現れる定型見出し */
const BOILERPLATE_HEADING_PATTERNS: RegExp[] = [
  /^#{1,6}\s*不確かな点は書かない.*$/gm,
  /^#{1,6}\s*.*推測禁止.*$/gm,
  /^#{1,6}\s*数値（.*）があれば明記.*$/gm,
  /^#{1,6}\s*.*があれば明記\s*$/gm,
  /^#{1,6}\s*何が変わったか／現状の制度内容\s*$/gm,
  /^#{1,6}\s*施行日・適用開始・経過措置\s*$/gm,
  /^#{1,6}\s*対象企業・対象者\s*$/gm,
  /^#{1,6}\s*人事が取るべき実務対応\s*$/gm,
]

/**
 * detail 本文から要約プロンプト由来の定型見出しを取り除く。
 * 見出し行のみを削除し、その下の本文は保持する。
 */
export function stripSummaryBoilerplate(detail: string): string {
  if (!detail) return ''

  let cleaned = detail
  for (const pattern of BOILERPLATE_HEADING_PATTERNS) {
    cleaned = cleaned.replace(pattern, '')
  }

  return cleaned.replace(/\n{3,}/g, '\n\n').trim()
}
