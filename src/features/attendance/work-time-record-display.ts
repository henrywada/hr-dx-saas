/**
 * work_time_records.source の画面表示用ラベル（DB 表記ゆれを吸収）
 * DB → 表示: csv_import|csv→csv, qr→QR, telework|pc→pc
 */
export function formatWorkTimeRecordSourceForDisplay(raw: string | null): string {
  if (raw == null || raw.trim() === '') {
    return '—'
  }
  const u = raw.trim().toLowerCase()
  if (u === 'csv' || u === 'csv_import') {
    return 'csv'
  }
  if (u === 'qr') {
    return 'QR'
  }
  if (u === 'telework' || u === 'pc') {
    return 'pc'
  }
  return raw.trim()
}

/** is_holiday の一覧表示 */
export function formatIsHolidayForDisplay(value: boolean | null): string {
  if (value === null) {
    return '—'
  }
  return value ? '休日' : '平日'
}
