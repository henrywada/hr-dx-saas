import { Buffer } from 'node:buffer'

type Extractor = (buffer: Buffer, mime: string, filename: string) => Promise<string>

interface ExtractDeps {
  /** テスト用に差し替え可能な本文抽出（既定は inquiry-chat の共通抽出） */
  extract?: Extractor
}

const UTF8_BOM = [0xef, 0xbb, 0xbf]

/**
 * テキスト/CSV のバイト列を文字列に復号する。
 * 日本の CSV は Shift_JIS が多いため、UTF-8 として不正なら Shift_JIS で読み直す。
 */
export function decodeTextBuffer(buffer: Buffer): string {
  const hasBom = UTF8_BOM.every((b, i) => buffer[i] === b)
  const body = hasBom ? buffer.subarray(UTF8_BOM.length) : buffer
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(body)
  } catch {
    return new TextDecoder('shift_jis').decode(body)
  }
}

function isTextLike(mime: string, filename: string): boolean {
  const lower = filename.toLowerCase()
  return (
    mime.includes('csv') ||
    mime === 'text/plain' ||
    lower.endsWith('.csv') ||
    lower.endsWith('.txt')
  )
}

async function defaultExtract(buffer: Buffer, mime: string, filename: string): Promise<string> {
  // pdf-parse 等の重いバンドルは取り込み時だけ読み込む
  const { extractTextFromUploadedFile } = await import('../inquiry-chat/extractors/files')
  return extractTextFromUploadedFile(buffer, mime, filename)
}

/**
 * 情報バンク用の本文抽出。
 * - CSV/TXT は文字コードを判定して UTF-8 に揃えてから既存の抽出へ渡す
 * - 抽出結果が空（スキャン画像のみの PDF など）なら失敗にする
 */
export async function extractInfoBankText(
  buffer: Buffer,
  mime: string,
  filename: string,
  deps: ExtractDeps = {}
): Promise<string> {
  const extract = deps.extract ?? defaultExtract
  const input = isTextLike(mime, filename) ? Buffer.from(decodeTextBuffer(buffer), 'utf8') : buffer

  const text = (await extract(input, mime, filename)).trim()
  if (text.length > 0) return text

  const isPdf = mime === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')
  throw new Error(
    isPdf
      ? 'PDF から文字を取り出せませんでした。スキャン画像のみの PDF の可能性があります（OCR には対応していません）'
      : 'ファイルから本文を取り出せませんでした'
  )
}
