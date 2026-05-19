// BOM付きUTF-8でCSVをダウンロードする（Excelで文字化けしない）

function escapeCsvCell(value: string): string {
  // カンマ・ダブルクォート・改行を含む場合はダブルクォートで囲む
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n')
  // BOM (U+FEFF) を先頭に付けてExcelの文字化けを防ぐ
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
