const CHUNK_MAX_CHARS = 900
const CHUNK_OVERLAP_CHARS = 100

/**
 * 日本語想定の単純チャンク分割（重複で文脈を保持）。
 * src/features/inquiry-chat/chunk.ts の chunkPlainText と同一ロジック
 * （Deno Edge Function は src/ を import できないため個別に保持する）。
 */
export function chunkPlainText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/ /g, ' ').trim()
  if (!normalized) return []

  const chunks: string[] = []
  let i = 0
  while (i < normalized.length) {
    let end = Math.min(i + CHUNK_MAX_CHARS, normalized.length)
    let slice = normalized.slice(i, end)

    if (end < normalized.length) {
      const relBreak = Math.max(
        slice.lastIndexOf('\n\n'),
        slice.lastIndexOf('\n'),
        slice.lastIndexOf('。'),
        slice.lastIndexOf('．'),
        slice.lastIndexOf('. ')
      )
      if (relBreak > CHUNK_MAX_CHARS * 0.25) {
        slice = normalized.slice(i, i + relBreak + 1)
      }
    }

    const trimmed = slice.trim()
    if (trimmed.length > 0) chunks.push(trimmed)

    const step = Math.max(1, slice.length - CHUNK_OVERLAP_CHARS)
    i += step
  }

  return chunks
}

/** HTML から本文らしきテキストを粗く抽出する（script/style除去 + タグ除去 + 空白正規化） */
export function extractTextFromHtml(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, ' ')
  const decoded = withoutTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  return decoded
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
