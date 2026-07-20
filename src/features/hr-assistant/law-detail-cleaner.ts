/**
 * 法令ナレッジ収集の要約プロンプトに書いたチェック項目が、
 * そのまま detail 本文の見出しとして出力されてしまう事象への対処。
 *
 * 全文書で同一の文字列が繰り返し現れるため、埋め込みベクトルの
 * 特徴が薄まり検索精度を落とす（実測で116チャンク中29件が該当し、
 * 無関係な質問に対して定型文チャンクが1位になる状態だった）。
 */

/**
 * 要約プロンプト由来で、全文書に共通して現れる定型ラベルの本体部分。
 * 正規表現の断片として使う（（）は全角）。
 */
const BOILERPLATE_LABEL_BODIES: string[] = [
  '不確かな点は書かない(?:（推測禁止）)?',
  '数値(?:（[^）]*）)?があれば明記',
  '何が変わったか／現状の制度内容',
  '施行日・適用開始・経過措置',
  '対象企業・対象者',
  '人事が取るべき実務対応',
]

/**
 * ラベル「だけ」の行にマッチする正規表現を組み立てる。
 * モデルは同じラベルを複数の装飾で出力してくるため、まとめて吸収する:
 *   `### ラベル` / `**ラベル**` / `【ラベル】` / `ラベル:` / 装飾なし
 *
 * 行頭・行末を厳密に固定しているため、地の文
 * （例: `人事が取るべき実務対応は以下の3ステップです。`）にはマッチしない。
 * 同様に本文中の太字（例: `* **時間外労働の上限**: 月45時間`）も対象外。
 */
function buildLabelLinePatterns(): RegExp[] {
  return BOILERPLATE_LABEL_BODIES.map(body => {
    // 装飾: 見出し記号 / 太字 / 隅付き括弧 の開き・閉じ
    const open = '(?:#{1,6}\\s*)?(?:\\*\\*)?(?:【)?'
    // コロンは太字の内側（`**ラベル:**`）にも外側（`**ラベル**:`）にも付く
    const colon = '(?:\\s*[:：])?'
    const close = `${colon}(?:】)?(?:\\*\\*)?${colon}`
    return new RegExp(`^[ \\t]*${open}${body}${close}[ \\t]*$`, 'gm')
  })
}

const BOILERPLATE_HEADING_PATTERNS: RegExp[] = buildLabelLinePatterns()

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
