import { format, parseISO } from 'date-fns'

/**
 * work_time_records.record_date（date / ISO 文字列）から暦月キー YYYY-MM を得る。
 * slice(0,7) だけだと非正規化の日付文字列で月が分裂するため集計・表示で共用する。
 */
export function yearMonthKeyFromRecordDate(recordDate: unknown): string | null {
  if (recordDate == null) {
    return null
  }
  if (recordDate instanceof Date && !Number.isNaN(recordDate.getTime())) {
    return format(recordDate, 'yyyy-MM')
  }
  if (typeof recordDate !== 'string') {
    return null
  }
  const s = recordDate.trim()
  const isoDay = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (isoDay) {
    return `${isoDay[1]}-${isoDay[2]}`
  }
  const d = parseISO(s)
  if (!Number.isNaN(d.getTime())) {
    return format(d, 'yyyy-MM')
  }
  return null
}
