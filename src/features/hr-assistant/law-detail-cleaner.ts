/**
 * 法令ナレッジ収集の要約プロンプトに書いたチェック項目が、
 * そのまま detail 本文の見出しとして出力されてしまう事象への対処。
 *
 * 全文書で同一の文字列が繰り返し現れるため、埋め込みベクトルの
 * 特徴が薄まり検索精度を落とす（実測で116チャンク中29件が該当し、
 * 無関係な質問に対して定型文チャンクが1位になる状態だった）。
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

  // 見出し削除で空いた行を詰める（3行以上の連続改行を2行へ）
  return cleaned.replace(/\n{3,}/g, '\n\n').trim()
}
