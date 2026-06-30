import assert from 'node:assert/strict'
import test from 'node:test'

import {
  addOneCalendarDayYmd,
  decodeWorkTimeCsvBytes,
  minutesBetween,
  normalizeRecordDateToYmd,
  resolveWorkPeriodTimes,
  workTimeCsvHasRequiredHeaders,
} from './work-time-csv-parse'
import { getAttendanceStatusTier } from './status'

test('normalizeRecordDateToYmd はスラッシュ形式を受け付ける', () => {
  assert.equal(normalizeRecordDateToYmd('2026/6/30'), '2026-06-30')
})

test('深夜跨ぎ勤務（22:00〜翌6:00）を翌日退勤として解釈する', () => {
  const { startIso, endIso } = resolveWorkPeriodTimes('2026-06-30', '22:00', '06:00')
  assert.ok(startIso)
  assert.ok(endIso)
  const mins = minutesBetween(startIso!, endIso!)
  assert.equal(mins, 8 * 60)
})

test('通常勤務（9:00〜18:00）は同一日として解釈する', () => {
  const { startIso, endIso } = resolveWorkPeriodTimes('2026-06-30', '9:00', '18:00')
  assert.equal(minutesBetween(startIso!, endIso!), 9 * 60)
})

test('addOneCalendarDayYmd は月末を繰り上げる', () => {
  assert.equal(addOneCalendarDayYmd('2026-06-30'), '2026-07-01')
})

test('getAttendanceStatusTier は45h/60h/80h境界で tier を切り替える', () => {
  const m45 = 45 * 60
  const m60 = 60 * 60
  const m80 = 80 * 60
  assert.equal(getAttendanceStatusTier(m45 - 1, false), 'normal')
  assert.equal(getAttendanceStatusTier(m45, false), 'caution')
  assert.equal(getAttendanceStatusTier(m60, false), 'warning')
  assert.equal(getAttendanceStatusTier(m80, false), 'danger')
  assert.equal(getAttendanceStatusTier(0, true), 'danger')
})

test('workTimeCsvHasRequiredHeaders は必須列を検出する', () => {
  const header =
    'employee_number,record_date,start_time,end_time,is_holiday\nE001,2026-06-30,9:00,18:00,0'
  assert.equal(workTimeCsvHasRequiredHeaders(header), true)
  assert.equal(workTimeCsvHasRequiredHeaders('name,date\n'), false)
})

test('decodeWorkTimeCsvBytes は UTF-8 CSV を読み込む', () => {
  const csv =
    'employee_number,record_date,start_time,end_time\nE001,2026-06-30,9:00,18:00\n'
  const bytes = new TextEncoder().encode(csv).buffer
  const { text, encoding } = decodeWorkTimeCsvBytes(bytes)
  assert.equal(encoding, 'utf-8')
  assert.match(text, /employee_number/)
})
