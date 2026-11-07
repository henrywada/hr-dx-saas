export interface PageText {
  num: number
  text: string
}

const PROBE_LENGTH = 30
/** 奥の断片が短すぎると別ページと誤一致するため、これ以上ある場合だけ使う */
const MIN_SECOND_PROBE_LENGTH = 10

/** 改行・空白の差（PDF 抽出とチャンク化での違い）を無視するため、空白をすべて除く */
function squash(text: string): string {
  return text.replace(/\s+/g, '')
}

/** 抜粋の先頭と、少し奥の 2 か所を照合用の断片にする（ページ境界のマーカー等に当たっても拾えるように） */
function probesOf(excerpt: string): string[] {
  const s = squash(excerpt)
  if (s.length === 0) return []
  const head = s.slice(0, PROBE_LENGTH)
  if (s.length < PROBE_LENGTH + MIN_SECOND_PROBE_LENGTH) return [head]
  return [head, s.slice(PROBE_LENGTH, PROBE_LENGTH * 2)]
}

/**
 * 引用された抜粋が載っているページ番号を返す。複数の抜粋があれば最も前のページ。
 * どのページにも見つからなければ null。
 */
export function locatePage(pages: readonly PageText[], excerpts: readonly string[]): number | null {
  const squashed = pages.map(p => ({ num: p.num, text: squash(p.text) }))
  const found = excerpts.flatMap(excerpt => {
    const hit = squashed.find(p => probesOf(excerpt).some(probe => p.text.includes(probe)))
    return hit ? [hit.num] : []
  })
  return found.length > 0 ? Math.min(...found) : null
}
