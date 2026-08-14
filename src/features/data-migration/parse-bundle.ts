import {
  decodeHealthCheckCsvBytes,
  mergeCsvPersons,
  parseCsvHeaders,
  parseHealthCheckCsvText,
} from '@/features/health-check/csv-parse'
import type { FileKind, KyokaiPresetSpec, MergedCsvPerson } from '@/features/health-check/types'
import { parseEmployeeCsvBytes } from './parse-employee'
import { parseStressCsvBytes } from './parse-stress'
import type { EmployeeCsvRow, StressCsvRow } from './types'

/** パースに必要な協会けんぽヘッダ定義（DB プリセットと同じ） */
export const MIGRATION_KYOKAI_PARSE_SPEC: KyokaiPresetSpec = {
  join_keys: ['個人コード', '健診日'],
  date_format: 'YYYYMMDD',
  employee_no_header: '個人コード',
  name_header: '漢字氏名',
  exam_date_header: '健診日',
  primary_secondary_header: '１次２次区分',
  overall_judgment_header: '総合判定',
  auto_pair_judgment_suffix: '判定',
  questionnaire_yes_token: '*',
  negative_token: '－',
  skip_headers: [],
  judgment_codes: [],
}

export type ParsedMigrationFiles = {
  employeeRows: EmployeeCsvRow[]
  employeeParseError: string | null
  healthPeople: MergedCsvPerson[]
  healthParseError: string | null
  headersByKind: Partial<Record<FileKind, string[]>>
  stressRows: StressCsvRow[]
  stressParseError: string | null
}

function parseHealthFile(
  bytes: ArrayBuffer,
  fileKind: FileKind
): {
  rows: ReturnType<typeof parseHealthCheckCsvText>['rows']
  headers: string[]
  error: string | null
} {
  const { text } = decodeHealthCheckCsvBytes(bytes)
  const parsed = parseHealthCheckCsvText(text, fileKind, MIGRATION_KYOKAI_PARSE_SPEC)
  const headers = parsed.headers.length > 0 ? parsed.headers : parseCsvHeaders(text)
  return { rows: parsed.rows, headers, error: parsed.error }
}

export function parseMigrationFiles(input: {
  employee?: ArrayBuffer | null
  kenshin1?: ArrayBuffer | null
  kenshin2?: ArrayBuffer | null
  monshin?: ArrayBuffer | null
  stress?: ArrayBuffer | null
}): ParsedMigrationFiles {
  let employeeRows: EmployeeCsvRow[] = []
  let employeeParseError: string | null = null
  if (input.employee && input.employee.byteLength > 0) {
    const parsed = parseEmployeeCsvBytes(input.employee)
    employeeRows = parsed.rows
    employeeParseError = parsed.error
  }

  const files: Partial<Record<FileKind, ReturnType<typeof parseHealthFile>['rows']>> = {}
  const headersByKind: Partial<Record<FileKind, string[]>> = {}
  const healthErrors: string[] = []
  const kinds: { key: 'kenshin1' | 'kenshin2' | 'monshin'; kind: FileKind }[] = [
    { key: 'kenshin1', kind: 'main' },
    { key: 'kenshin2', kind: 'additional' },
    { key: 'monshin', kind: 'questionnaire' },
  ]
  for (const { key, kind } of kinds) {
    const bytes = input[key]
    if (!bytes || bytes.byteLength === 0) continue
    const parsed = parseHealthFile(bytes, kind)
    if (parsed.error) healthErrors.push(`${kind}: ${parsed.error}`)
    files[kind] = parsed.rows
    headersByKind[kind] = parsed.headers
  }
  const healthPeople = mergeCsvPersons(files)

  let stressRows: StressCsvRow[] = []
  let stressParseError: string | null = null
  if (input.stress && input.stress.byteLength > 0) {
    const parsed = parseStressCsvBytes(input.stress)
    stressRows = parsed.rows
    stressParseError = parsed.error
  }

  return {
    employeeRows,
    employeeParseError,
    healthPeople,
    healthParseError: healthErrors[0] ?? null,
    headersByKind,
    stressRows,
    stressParseError,
  }
}
