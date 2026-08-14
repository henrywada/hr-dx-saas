import Papa from 'papaparse'
import { normalizeEmployeeNo } from '@/features/health-check/csv-parse'
import { decodeCsvBytes, detectDelimiter } from './decode-csv'
import { parseFlexibleDate } from './dates'
import type { StressCsvRow } from './types'

function cell(rec: Record<string, string>, key: string): string {
  const target = key.replace(/^\uFEFF/, '').trim()
  for (const [k, v] of Object.entries(rec)) {
    if (
      String(k)
        .replace(/^\uFEFF/, '')
        .trim() === target
    )
      return String(v ?? '').trim()
  }
  return ''
}

export function parseStressCsvText(text: string): {
  rows: StressCsvRow[]
  error: string | null
} {
  const delimiter = detectDelimiter(text)
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter,
  })
  const fields = (parsed.meta.fields ?? []).map(h =>
    String(h ?? '')
      .replace(/^\uFEFF/, '')
      .trim()
  )
  if (!fields.includes('employee_no')) {
    return { rows: [], error: '必須列「employee_no」がありません' }
  }
  if (!fields.includes('YMD')) {
    return { rows: [], error: '必須列「YMD」がありません' }
  }

  const rows: StressCsvRow[] = []
  parsed.data.forEach((rec, i) => {
    const line = i + 2
    const employeeNo = normalizeEmployeeNo(cell(rec, 'employee_no'))
    const ymdRaw = cell(rec, 'YMD')
    const examDateYmd = parseFlexibleDate(ymdRaw)
    const answers: number[] = []
    let error: string | null = null
    if (!employeeNo) error = 'employee_no が空です'
    else if (!examDateYmd) error = 'YMD が不正です'
    for (let n = 1; n <= 57; n++) {
      const raw = cell(rec, `A${n}`)
      const num = Number(raw)
      if (!Number.isInteger(num) || num < 1 || num > 4) {
        if (!error) error = `A${n} が 1〜4 ではありません`
        answers.push(0)
      } else {
        answers.push(num)
      }
    }
    rows.push({ line, employeeNo, ymdRaw, examDateYmd, answers, error })
  })
  return { rows, error: null }
}

export function parseStressCsvBytes(bytes: ArrayBuffer) {
  const { text } = decodeCsvBytes(bytes)
  return parseStressCsvText(text)
}
