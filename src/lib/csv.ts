// BOM付きUTF-8でCSVをダウンロードする（Excelで文字化けしない）

/** CSV インジェクション（数式実行）対策: 先頭が = + - @ | タブの場合はシングルクォートを付与 */
export function sanitizeCsvFormula(value: string): string {
  if (/^[=+\-@|\t\r]/.test(value)) {
    return `'${value}`
  }
  return value
}

export function escapeCsvCell(value: string): string {
  const sanitized = sanitizeCsvFormula(value)
  // カンマ・ダブルクォート・改行を含む場合はダブルクォートで囲む
  if (
    sanitized.includes('"') ||
    sanitized.includes(',') ||
    sanitized.includes('\n') ||
    sanitized.includes('\r')
  ) {
    return `"${sanitized.replace(/"/g, '""')}"`
  }
  return sanitized
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map(row => row.map(cell => escapeCsvCell(cell)).join(',')).join('\r\n')
  // BOM (U+FEFF) を先頭に付けてExcelの文字化けを防ぐ
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
