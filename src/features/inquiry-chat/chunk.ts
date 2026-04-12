import { CHUNK_MAX_CHARS, CHUNK_OVERLAP_CHARS } from './constants'

/**
 * 日本語想定の単純チャンク分割（重複で文脈を保持）
 */
export function chunkPlainText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ').trim()
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
