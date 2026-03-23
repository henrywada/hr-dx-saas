/** supervisor QR 権限一括登録用 CSV（ヘッダー検証・行パース） */

export const SQP_CSV_HEADERS = ['supervisor_email', 'employee_email', 'can_display'] as const

export type SqpCsvRow = {
  line: number
  supervisor_email: string
  employee_email: string
  can_display: boolean
}

export function parseSupervisorQrPermissionCsv(text: string): {
  ok: true
  rows: SqpCsvRow[]
} | {
  ok: false
  error: string
} {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  if (lines.length < 2) {
    return { ok: false, error: 'CSV にヘッダーとデータ行が必要です' }
  }

  const header = lines[0].split(',').map((c) => c.trim().toLowerCase())
  const expected = [...SQP_CSV_HEADERS]
  if (header.length < expected.length || !expected.every((h, i) => header[i] === h)) {
    return {
      ok: false,
      error: `先頭行は ${expected.join(',')} の順である必要があります`,
    }
  }

  const rows: SqpCsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1
    const parts = splitCsvLine(lines[i])
    if (parts.length < 3) {
      return { ok: false, error: `${lineNo} 行目: 列が不足しています` }
    }
    const sup = parts[0].trim().toLowerCase()
    const emp = parts[1].trim().toLowerCase()
    const flagRaw = parts[2].trim()
    if (!sup.includes('@') || !emp.includes('@')) {
      return { ok: false, error: `${lineNo} 行目: メール形式が不正です` }
    }
    if (flagRaw === '') {
      return { ok: false, error: `${lineNo} 行目: can_display が空です（1 または 0）` }
    }
    const flag = flagRaw === '1' || flagRaw.toLowerCase() === 'true' || flagRaw === 'はい'
    const flagOff = flagRaw === '0' || flagRaw.toLowerCase() === 'false' || flagRaw === 'いいえ'
    if (!flag && !flagOff) {
      return { ok: false, error: `${lineNo} 行目: can_display は 1 または 0 です` }
    }
    const can_display = flag
    rows.push({
      line: lineNo,
      supervisor_email: sup,
      employee_email: emp,
      can_display,
    })
  }

  return { ok: true, rows }
}

export function supervisorQrPermissionCsvTemplate(): string {
  return `${SQP_CSV_HEADERS.join(',')}\n` + 'supervisor@example.com,employee@example.com,1\n'
}

/** 簡易 CSV 行分割（ダブルクォート対応） */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQ = !inQ
      }
      continue
    }
    if (c === ',' && !inQ) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += c
  }
  out.push(cur)
  return out
}
