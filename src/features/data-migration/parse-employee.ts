import Papa from 'papaparse'
import { normalizeEmployeeNo } from '@/features/health-check/csv-parse'
import { decodeCsvBytes, detectDelimiter } from './decode-csv'
import { mapEmployeeSex } from './dates'
import type { EmployeeCsvRow } from './types'

function cell(rec: Record<string, string>, key: string): string {
  const target = key.replace(/\s/g, '')
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

function orgPathFromRecord(rec: Record<string, string>): string[] {
  const parts: string[] = []
  for (let i = 1; i <= 5; i++) {
    const full = `組織${String.fromCharCode(0xff10 + i)}`
    const half = `組織${i}`
    const v = cell(rec, full) || cell(rec, half)
    if (v) parts.push(v)
  }
  return parts
}

const MAIL_HEADERS = ['mailadress', 'mailaddress', 'email', 'mail', 'mail_address']

function emailFromRecord(rec: Record<string, string>): string {
  for (const key of MAIL_HEADERS) {
    const v = cell(rec, key)
    if (v) return v.toLowerCase()
  }
  return ''
}

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function parseEmployeeCsvText(text: string): {
  rows: EmployeeCsvRow[]
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
      .replace(/\s/g, '')
      .trim()
  )
  if (!fields.some(h => h === 'employee_no')) {
    return { rows: [], error: '必須列「employee_no」がありません' }
  }
  if (!fields.some(h => MAIL_HEADERS.includes(h))) {
    return { rows: [], error: '必須列「mailadress」がありません' }
  }

  const seenNo = new Map<string, number>()
  const seenMail = new Map<string, number>()
  const rows: EmployeeCsvRow[] = []
  parsed.data.forEach((rec, i) => {
    const line = i + 2
    const employeeNo = normalizeEmployeeNo(cell(rec, 'employee_no'))
    const name = cell(rec, 'name')
    const nameKana = cell(rec, 'name-kana')
    const email = emailFromRecord(rec)
    const sexRaw = cell(rec, 'sex')
    const birth = cell(rec, 'birth')
    const orgPath = orgPathFromRecord(rec)
    let error: string | null = null
    if (!employeeNo) error = 'employee_no が空です'
    else if (seenNo.has(employeeNo))
      error = `employee_no が重複しています（${seenNo.get(employeeNo)} 行目）`
    else seenNo.set(employeeNo, line)
    if (!error && !name) error = 'name が空です'
    if (!error && !email) error = 'mailadress が空です'
    else if (!error && !isLikelyEmail(email)) error = `mailadress の形式が不正です（${email}）`
    else if (!error && seenMail.has(email))
      error = `mailadress が重複しています（${seenMail.get(email)} 行目）`
    else if (email) seenMail.set(email, line)
    rows.push({
      line,
      employeeNo,
      name,
      nameKana,
      email,
      sexRaw,
      sex: mapEmployeeSex(sexRaw),
      birth,
      orgPath,
      error,
    })
  })
  return { rows, error: null }
}

export function parseEmployeeCsvBytes(bytes: ArrayBuffer) {
  const { text } = decodeCsvBytes(bytes)
  return parseEmployeeCsvText(text)
}
