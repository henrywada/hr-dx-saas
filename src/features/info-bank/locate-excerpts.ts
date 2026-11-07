export interface TextRange {
  start: number
  end: number
}

/** チャンク化（chunkPlainText）と同じ正規化。表示する本文にもこれを適用して位置を合わせる */
export function normalizeForMatch(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/ /g, ' ')
}

/**
 * 本文の中から引用チャンクの位置を探す。見つからない抜粋は無視し、重なる範囲はまとめる。
 * text は normalizeForMatch 済みであること。
 */
export function locateExcerpts(text: string, excerpts: readonly string[]): TextRange[] {
  const found: TextRange[] = []
  for (const excerpt of excerpts) {
    const needle = excerpt.trim()
    if (!needle) continue
    const start = text.indexOf(needle)
    if (start >= 0) found.push({ start, end: start + needle.length })
  }
  found.sort((a, b) => a.start - b.start)

  return found.reduce<TextRange[]>((merged, range) => {
    const last = merged[merged.length - 1]
    if (last && range.start <= last.end) {
      return [...merged.slice(0, -1), { start: last.start, end: Math.max(last.end, range.end) }]
    }
    return [...merged, range]
  }, [])
}
