/**
 * 要約プロンプトのチェック項目が detail の見出しとして出力される事象への保険。
 * プロンプト側でも禁止しているが、モデルが従わない場合に備えて保存前に除去する。
 *
 * src/features/hr-assistant/law-detail-cleaner.ts と同一ロジック
 * （Deno Edge Function は src/ を import できないため個別に保持する）。
 */

/**
 * 要約プロンプト由来で、全文書に共通して現れる定型見出しの中身。
 * モデルは `### 見出し` と `**見出し**` の両形式で出力してくる。
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
 * 本文中の太字（例: `* **時間外労働の上限**: 月45時間`）は
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

  return cleaned.replace(/\n{3,}/g, '\n\n').trim()
}
