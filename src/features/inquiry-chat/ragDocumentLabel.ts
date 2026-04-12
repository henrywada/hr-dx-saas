import type { RagDocumentListItem } from './queries'

/** 登録済み文書テーブル「区分」列用（PDF / DOCX / Excel 等） */
export function ragDocumentFormatLabel(d: RagDocumentListItem): string {
  if (d.source_kind === 'paste') return 'テキスト'
  if (d.source_kind === 'url') return 'URL'
  if (d.source_kind === 'file') {
    const name = d.original_filename?.toLowerCase() ?? ''
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : ''
    const byExt: Record<string, string> = {
      pdf: 'PDF',
      docx: 'DOCX',
      doc: 'DOC',
      xlsx: 'Excel',
      xls: 'Excel',
      csv: 'CSV',
      txt: 'TXT',
    }
    if (ext && byExt[ext]) return byExt[ext]

    const m = (d.mime_type ?? '').toLowerCase()
    if (m.includes('pdf')) return 'PDF'
    if (m.includes('wordprocessingml') || m === 'application/msword') return 'DOCX'
    if (m.includes('spreadsheetml') || m.includes('ms-excel')) return 'Excel'
    if (m === 'text/csv' || m.includes('csv')) return 'CSV'
    if (m === 'text/plain') return 'TXT'
    return ext ? ext.toUpperCase() : '—'
  }
  return d.source_kind || '—'
}
