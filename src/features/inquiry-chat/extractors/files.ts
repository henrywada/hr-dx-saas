import type { Buffer } from 'node:buffer'
import { extractTextFromDocx } from './docx'
import { extractTextFromPdf } from './pdf'
import { extractTextFromSpreadsheet } from './xlsx'

export async function extractTextFromUploadedFile(
  buffer: Buffer,
  mime: string,
  filename: string
): Promise<string> {
  const m = mime.toLowerCase()
  const lower = filename.toLowerCase()

  if (m === 'application/pdf' || lower.endsWith('.pdf')) {
    return extractTextFromPdf(buffer)
  }
  if (
    m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lower.endsWith('.docx')
  ) {
    return extractTextFromDocx(buffer)
  }
  if (
    m === 'text/csv' ||
    lower.endsWith('.csv') ||
    (m === 'text/plain' && lower.endsWith('.csv'))
  ) {
    return extractTextFromSpreadsheet(buffer, m, filename)
  }
  if (
    m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    m === 'application/vnd.ms-excel' ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls')
  ) {
    return extractTextFromSpreadsheet(buffer, m, filename)
  }
  if (m === 'text/plain' || lower.endsWith('.txt')) {
    return buffer.toString('utf8').trim()
  }

  throw new Error('このファイル形式は取り込みに対応していません（PDF, DOCX, Excel, CSV, テキスト）')
}
