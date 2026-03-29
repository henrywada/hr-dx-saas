/**
 * work_time_records.source を一覧表示用ラベルへ変換
 */
export function formatWorkTimeRecordSourceLabel(
  source: string | null | undefined,
): string | null {
  if (source == null || String(source).trim() === '') return null
  const s = String(source).trim()
  switch (s) {
    case 'qr':
      return 'QR'
    case 'csv_import':
      return 'csv'
    case 'telework':
      return 'Remote'
    default:
      return s
  }
}
