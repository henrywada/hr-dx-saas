/**
 * 法令ナレッジ収集の要約プロンプトに書いたチェック項目が、
 * そのまま detail 本文の見出しとして出力されてしまう事象への対処。
 *
 * 全文書で同一の文字列が繰り返し現れるため、埋め込みベクトルの
 * 特徴が薄まり検索精度を落とす（実測で116チャンク中29件が該当し、
 * 無関係な質問に対して定型文チャンクが1位になる状態だった）。
 */

/**
 * 要約プロンプト由来で、全文書に共通して現れる定型見出しの中身。
 * モデルは `### 見出し` と `**見出し**` の両形式で出力してくるため、
 * 見出し記法は下の buildHeadingPatterns() で両方を組み立てる。
 */
const BOILERPLATE_HEADING_BODIES: string[] = [
  '不確かな点は書かない.*',
  '.*推測禁止.*',
  '.*があれば明記',
  '何が変わったか／現状の制度内容',
  '施行日・適用開始・経過措置',
  '対象企業・対象者',
  '人事が取るべき実務対応',
]

/**
 * 見出し行にマッチする正規表現を組み立てる。
 * - `### 見出し` 形式（markdown heading）
 * - `**見出し**` だけの行（太字を見出し代わりに使う形式）
 * 本文中に現れる太字（例: `* **時間外労働の上限**: 月45時間`）は
 * 行全体が太字のみではないためマッチしない。
 */
function buildHeadingPatterns(): RegExp[] {
  return BOILERPLATE_HEADING_BODIES.flatMap(body => [
    new RegExp(`^#{1,6}\\s*${body}\\s*$`, 'gm'),
    new RegExp(`^\\s*\\*\\*${body}\\*\\*\\s*$`, 'gm'),
  ])
}

const BOILERPLATE_HEADING_PATTERNS: RegExp[] = buildHeadingPatterns()

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
