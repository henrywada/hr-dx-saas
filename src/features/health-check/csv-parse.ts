/**
 * 健診 CSV のデコード・3ファイル結合。エンコーディングは UTF-8 → CP932（Shift_JIS）。
 * 結合キー: 個人コード + 健診日（YYYYMMDD）。空セルは未実施。
 */
import Papa from 'papaparse'
import { stripBom } from '@/features/attendance/work-time-csv-parse'
import { normalizeHeader } from './kyokai-preset'
import type { CsvPersonRow, FileKind, KyokaiPresetSpec, MergedCsvPerson } from './types'

export function decodeHealthCheckCsvBytes(bytes: ArrayBuffer): {
  text: string
  encoding: 'utf-8' | 'shift_jis'
} {
  const utf8Text = stripBom(new TextDecoder('utf-8').decode(bytes))
  try {
    const sjisText = stripBom(new TextDecoder('shift-jis').decode(bytes))
    const utf8Bad = (utf8Text.match(/\uFFFD/g) || []).length
    const sjisBad = (sjisText.match(/\uFFFD/g) || []).length
    if (sjisText.includes('個人コード') && !utf8Text.includes('個人コード')) {
      return { text: sjisText, encoding: 'shift_jis' }
    }
    if (sjisBad < utf8Bad) return { text: sjisText, encoding: 'shift_jis' }
  } catch {
    // shift-jis 非対応環境
  }
  return { text: utf8Text, encoding: 'utf-8' }
}

export function parseYyyymmdd(raw: string): string | null {
  const s = raw.trim().replace(/\D/g, '')
  if (s.length !== 8) return null
  const y = Number(s.slice(0, 4))
  const m = Number(s.slice(4, 6))
  const d = Number(s.slice(6, 8))
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null
  }
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

/**
 * CSV「個人コード」と employees.employee_no を同じ規則で揃える。
 * 全角英数・前後空白を除去。Excel が数値化した末尾 .0 だけ落とす（先頭ゼロは残す）。
 */
export function normalizeEmployeeNo(raw: string | null | undefined): string {
  if (raw == null) return ''
  let s = String(raw)
    .replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, '')
    .trim()
  if (/^\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, '')
  return s
}

function cell(rec: Record<string, string>, header: string): string {
  const n = normalizeHeader(header)
  for (const [k, v] of Object.entries(rec)) {
    if (normalizeHeader(k) === n) return String(v ?? '').trim()
  }
  return ''
}

export function parseHealthCheckCsvText(
  text: string,
  fileKind: FileKind,
  spec: KyokaiPresetSpec
): { rows: CsvPersonRow[]; headers: string[]; error: string | null } {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })
  const headers = (parsed.meta.fields ?? []).map(h => String(h ?? '').trim())
  if (!headers.some(h => normalizeHeader(h) === normalizeHeader(spec.employee_no_header))) {
    return { rows: [], headers, error: `必須列「${spec.employee_no_header}」がありません` }
  }

  const rows: CsvPersonRow[] = []
  parsed.data.forEach((rec, i) => {
    const employeeNo = normalizeEmployeeNo(cell(rec, spec.employee_no_header))
    if (!employeeNo) return
    const examDateRaw = cell(rec, spec.exam_date_header)
    const cells: Record<string, string> = {}
    for (const [k, v] of Object.entries(rec)) {
      cells[k.trim()] = String(v ?? '').trim()
    }
    rows.push({
      line: i + 2,
      employeeNo,
      name: cell(rec, spec.name_header),
      examDateRaw,
      examDateYmd: parseYyyymmdd(examDateRaw),
      primarySecondary: cell(rec, spec.primary_secondary_header) || null,
      overallJudgmentRaw: cell(rec, spec.overall_judgment_header) || null,
      cells,
      fileKind,
    })
  })
  return { rows, headers, error: null }
}

/** 形式サンプル用。データ行がなくても列名だけ取る */
export function parseCsvHeaders(text: string): string[] {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    preview: 1,
  })
  return (parsed.meta.fields ?? []).map(h => String(h ?? '').trim()).filter(Boolean)
}

export function mergeCsvPersons(
  files: Partial<Record<FileKind, CsvPersonRow[]>>
): MergedCsvPerson[] {
  const map = new Map<string, MergedCsvPerson>()
  const kinds: FileKind[] = ['main', 'additional', 'questionnaire']
  for (const kind of kinds) {
    for (const row of files[kind] ?? []) {
      if (!row.examDateYmd) continue
      const key = `${row.employeeNo}::${row.examDateYmd}`
      const existing = map.get(key)
      if (!existing) {
        map.set(key, {
          employeeNo: row.employeeNo,
          name: row.name,
          examDateYmd: row.examDateYmd,
          primarySecondary: row.primarySecondary,
          overallJudgmentRaw: row.overallJudgmentRaw,
          files: { [kind]: row.cells },
          warnings: [],
        })
      } else {
        existing.files[kind] = { ...(existing.files[kind] ?? {}), ...row.cells }
        if (!existing.overallJudgmentRaw && row.overallJudgmentRaw) {
          existing.overallJudgmentRaw = row.overallJudgmentRaw
        }
        if (!existing.primarySecondary && row.primarySecondary) {
          existing.primarySecondary = row.primarySecondary
        }
        if (existing.name && row.name && existing.name !== row.name) {
          existing.warnings.push(`氏名がファイル間で不一致: ${existing.name} / ${row.name}`)
        }
      }
    }
  }
  return Array.from(map.values())
}

export function isEmptyCell(value: string | undefined | null): boolean {
  return value == null || value.trim() === ''
}
