import type { Buffer } from 'node:buffer'
import * as XLSX from 'xlsx'

/** Excel / CSV をシート名付きのプレーンテキストに変換 */
export function extractTextFromSpreadsheet(
  buffer: Buffer,
  mimeHint?: string | null,
  filename?: string
): string {
  const lower = (filename || '').toLowerCase()
  const isCsv =
    mimeHint?.includes('csv') === true || lower.endsWith('.csv')
  const readOpts: XLSX.ParsingOptions = { type: 'buffer', raw: false, cellDates: true }
  const workbook = isCsv
    ? XLSX.read(buffer.toString('utf8'), { type: 'string', raw: false })
    : XLSX.read(buffer, readOpts)

  const parts: string[] = []
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) continue
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: '\t', blankrows: false })
    const block = csv.trim()
    if (block) {
      parts.push(`【${sheetName}】\n${block}`)
    }
  }
  return parts.join('\n\n').trim()
}
