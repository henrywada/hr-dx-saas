'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import Papa from 'papaparse'
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  Upload,
} from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import {
  commitWorkTimeCsvImport,
  validateWorkTimeCsvRows,
  type WorkTimeCsvCommitRow,
  type WorkTimeCsvRawInput,
  type WorkTimeCsvValidatedRow,
} from '@/features/attendance/work-time-csv-actions'
import {
  normalizeHeaderCell,
  stripBom,
  WORK_TIME_CSV_REQUIRED_HEADERS,
} from '@/features/attendance/work-time-csv-parse'

const MAX_BYTES = 5 * 1024 * 1024

type Step = 1 | 2 | 3 | 4 | 5 | 'done'

function stepOrder(s: Step): number {
  if (s === 'done') return 6
  return s
}

function normalizeRecord(record: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(record)) {
    out[normalizeHeaderCell(k)] = String(v ?? '').trim()
  }
  return out
}

function recordsToRawInputs(records: Record<string, string>[]): WorkTimeCsvRawInput[] {
  return records.map((rec, i) => ({
    line: i + 2,
    employee_number: rec['employee_number'] ?? '',
    record_date: rec['record_date'] ?? '',
    start_time: rec['start_time'] ?? '',
    end_time: rec['end_time'] ?? '',
    is_holiday: rec['is_holiday'],
    duration_minutes: rec['duration_minutes'],
  }))
}

/** 編集ステップ用の行（文字列で保持） */
type EditableRow = {
  line: number
  employee_number: string
  record_date: string
  start_time: string
  end_time: string
  is_holiday: string
  employee_id: string | null
  employee_name: string | null
}

function validatedToEditable(rows: WorkTimeCsvValidatedRow[]): EditableRow[] {
  return rows.map((r) => ({
    line: r.line,
    employee_number: r.employee_number,
    record_date: r.record_date,
    start_time: r.start_time,
    end_time: r.end_time,
    is_holiday: r.is_holiday ? '1' : '0',
    employee_id: r.employee_id,
    employee_name: r.employee_name,
  }))
}

function editableToRaw(rows: EditableRow[]): WorkTimeCsvRawInput[] {
  return rows.map((r) => ({
    line: r.line,
    employee_number: r.employee_number,
    record_date: r.record_date,
    start_time: r.start_time,
    end_time: r.end_time,
    is_holiday: r.is_holiday,
    duration_minutes: '',
  }))
}

function editableToCommit(rows: EditableRow[]): WorkTimeCsvCommitRow[] {
  return rows
    .filter((r) => r.employee_id)
    .map((r) => ({
      line: r.line,
      employee_number: r.employee_number.trim(),
      employee_id: r.employee_id!,
      record_date: r.record_date.trim(),
      start_time: r.start_time.trim(),
      end_time: r.end_time.trim(),
      is_holiday: r.is_holiday === '1' || r.is_holiday.toLowerCase() === 'true',
    }))
}

type WorkTimeCsvWizardProps = {
  /** 確定保存で 1 件以上成功したあとに月次一覧などを再取得するため */
  onRecordsMutated?: () => void
}

export function WorkTimeCsvWizard({ onRecordsMutated }: WorkTimeCsvWizardProps) {
  const [step, setStep] = useState<Step>(1)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rawInputs, setRawInputs] = useState<WorkTimeCsvRawInput[] | null>(null)
  const [validated, setValidated] = useState<WorkTimeCsvValidatedRow[] | null>(null)
  const [editable, setEditable] = useState<EditableRow[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [commitResult, setCommitResult] = useState<Awaited<
    ReturnType<typeof commitWorkTimeCsvImport>
  > | null>(null)

  const resetFlow = useCallback(() => {
    setStep(1)
    setFileName(null)
    setRawInputs(null)
    setValidated(null)
    setEditable(null)
    setMessage(null)
    setCommitResult(null)
  }, [])

  const parseFile = useCallback((file: File) => {
    setMessage(null)
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setMessage('拡張子は .csv のみ対応しています。')
      return
    }
    if (file.size > MAX_BYTES) {
      setMessage('ファイルサイズは 5MB 以下にしてください。')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const text = stripBom(String(reader.result ?? ''))
      Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const fields = result.meta.fields?.map((f) => normalizeHeaderCell(f ?? '')) ?? []
          for (const h of WORK_TIME_CSV_REQUIRED_HEADERS) {
            if (!fields.includes(h)) {
              setMessage(`必須列がありません: ${h}（ヘッダー: ${fields.join(', ')}）`)
              return
            }
          }
          const data = (result.data as Record<string, unknown>[]).map(normalizeRecord)
          const inputs = recordsToRawInputs(data)
          if (inputs.length === 0) {
            setMessage('データ行がありません。')
            return
          }
          setFileName(file.name)
          setRawInputs(inputs)
          setStep(2)
        },
        error: (err) => setMessage(err.message || 'CSV の読み込みに失敗しました。'),
      })
    }
    reader.readAsText(file, 'UTF-8')
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const f = e.dataTransfer.files[0]
      if (f) parseFile(f)
    },
    [parseFile],
  )

  const step2Validate = async () => {
    if (!rawInputs?.length) return
    setLoading(true)
    setMessage(null)
    try {
      const res = await validateWorkTimeCsvRows(rawInputs)
      if (res.ok === false) {
        setMessage(res.error)
        return
      }
      setValidated(res.data)
      setEditable(validatedToEditable(res.data))
      setStep(3)
    } finally {
      setLoading(false)
    }
  }

  const revalidateEditable = async (): Promise<boolean> => {
    if (!editable?.length) return false
    setLoading(true)
    setMessage(null)
    try {
      const res = await validateWorkTimeCsvRows(editableToRaw(editable))
      if (res.ok === false) {
        setMessage(res.error)
        return false
      }
      setValidated(res.data)
      setEditable(validatedToEditable(res.data))
      const hasErr = res.data.some((r) => r.error)
      if (hasErr) {
        setMessage('エラーがある行があります。内容を修正するか、該当行を削除してください。')
        return false
      }
      return true
    } finally {
      setLoading(false)
    }
  }

  const goFinal = async () => {
    const ok = await revalidateEditable()
    if (ok) setStep(5)
  }

  const save = async () => {
    if (!editable?.length) return
    const rows = editableToCommit(editable)
    if (rows.length === 0) {
      setMessage('保存できる行がありません（従業員が解決できている行のみ保存されます）。')
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const res = await commitWorkTimeCsvImport(rows)
      setCommitResult(res)
      if (res.ok === true && res.data.summary.success > 0) {
        onRecordsMutated?.()
      }
      if (res.ok === true && res.data.summary.failed === 0) {
        setStep('done')
      } else if (res.ok === true) {
        const firstErr = res.data.details.find((d) => d.error)?.error
        setMessage(
          `一部失敗: 成功 ${res.data.summary.success} / 失敗 ${res.data.summary.failed}` +
            (firstErr ? ` — ${firstErr}` : ''),
        )
      } else {
        setMessage(res.error ?? '保存に失敗しました')
      }
    } finally {
      setLoading(false)
    }
  }

  const updateEditable = (line: number, patch: Partial<EditableRow>) => {
    setEditable((prev) =>
      prev ? prev.map((r) => (r.line === line ? { ...r, ...patch } : r)) : prev,
    )
  }

  const removeEditableLine = (line: number) => {
    setEditable((prev) => (prev ? prev.filter((r) => r.line !== line) : prev))
    setValidated((prev) => (prev ? prev.filter((r) => r.line !== line) : prev))
  }

  const stepLabels: { n: 1 | 2 | 3 | 4 | 5; label: string }[] = [
    { n: 1, label: 'CSV 読み込み' },
    { n: 2, label: 'チェック' },
    { n: 3, label: '一覧確認' },
    { n: 4, label: '修正' },
    { n: 5, label: '確定保存' },
  ]

  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap gap-2 items-center text-xs text-slate-600" aria-label="取り込みステップ">
        {stepLabels.map(({ n, label }) => (
          <span key={n} className="flex items-center gap-1">
            <span
              className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 font-semibold ${
                step === n
                  ? 'bg-accent-orange text-white'
                  : stepOrder(step) > n
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {n}
            </span>
            <span className="hidden sm:inline">{label}</span>
            {n < 5 && <ChevronRight className="h-3 w-3 text-slate-400 hidden sm:inline" />}
          </span>
        ))}
      </nav>

      <div className="flex flex-wrap gap-4">
        <Link
          href={APP_ROUTES.TENANT.ADMIN_ATTENDANCE_DASHBOARD}
          className="text-sm text-slate-600 hover:text-accent-orange underline-offset-2 hover:underline"
        >
          出勤・退勤データの明細一覧へ戻る
        </Link>
        <a
          href="/doc/overtime/work_time_records_template.csv"
          download="work_time_records_template.csv"
          className="text-sm font-medium text-accent-orange hover:underline"
        >
          テンプレート CSV をダウンロード
        </a>
        <button
          type="button"
          onClick={resetFlow}
          className="text-sm text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline"
        >
          最初からやり直す
        </button>
      </div>

      {message && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {/* 1: 読み込み */}
      {step === 1 && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-8 text-center"
        >
          <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-400 mb-3" />
          <p className="text-sm text-slate-600 mb-2">
            必須列: {WORK_TIME_CSV_REQUIRED_HEADERS.join(', ')}（
            <code className="text-xs bg-slate-100 px-1 rounded">record_date</code> は YYYY-MM-DD または
            YYYY/MM/DD、UTF-8、5MB 以下）
          </p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50">
            <Upload className="h-4 w-4" />
            ファイルを選択
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) parseFile(f)
              }}
            />
          </label>
        </div>
      )}

      {/* 2: チェック実行 */}
      {step === 2 && rawInputs && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-700">
            ファイル: <span className="font-mono">{fileName}</span> / {rawInputs.length} 行
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void step2Validate()}
            className="inline-flex items-center gap-2 rounded-lg bg-accent-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            チェックを実行
          </button>
        </div>
      )}

      {/* 3: 一覧確認（読み取り専用） */}
      {step === 3 && validated && (
        <div className="space-y-4">
          <PreviewTable rows={validated} editable={false} />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm text-slate-600 hover:underline"
            >
              戻る
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="rounded-lg bg-accent-orange px-4 py-2 text-sm font-semibold text-white"
            >
              次へ（修正）
            </button>
          </div>
        </div>
      )}

      {/* 4: 修正 */}
      {step === 4 && editable && validated && (
        <div className="space-y-4">
          <PreviewTable
            rows={validated}
            editable
            editableRows={editable}
            onChange={updateEditable}
            onRemove={removeEditableLine}
          />
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setStep(3)} className="text-sm text-slate-600 hover:underline">
              戻る
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void goFinal()}
              className="rounded-lg bg-accent-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : null}
              最終確認へ
            </button>
          </div>
        </div>
      )}

      {/* 5: 最終確認 */}
      {step === 5 && editable && validated && (
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
            <p className="font-medium text-slate-900">保存内容の確認</p>
            <ul className="mt-2 list-disc list-inside text-slate-600 space-y-1">
              <li>保存対象: {editableToCommit(editable).length} 行（従業員番号が解決でき、検証エラーがない行のみ）</li>
              <li>同一テナント・同一従業員・同一日の既存データは上書きされます。</li>
              <li>対象月の月次集計（overtime_monthly_stats）は再集計のため一旦削除されます。</li>
            </ul>
          </div>
          <PreviewTable rows={validated} editable={false} />
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setStep(4)} className="text-sm text-slate-600 hover:underline">
              戻る
            </button>
            <button
              type="button"
              disabled={loading || editableToCommit(editable).length === 0}
              onClick={() => void save()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              保存する
            </button>
          </div>
        </div>
      )}

      {step === 'done' && commitResult?.ok && commitResult.data && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-6 space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-medium">
            <CheckCircle2 className="h-6 w-6" />
            保存が完了しました
          </div>
          <p className="text-sm text-emerald-900">
            成功 {commitResult.data.summary.success} 件 / 失敗 {commitResult.data.summary.failed} 件
          </p>
          <Link
            href={APP_ROUTES.TENANT.ADMIN_ATTENDANCE_DASHBOARD}
            className="inline-block text-sm font-medium text-accent-orange hover:underline"
          >
            出勤・退勤データの明細一覧を開く
          </Link>
        </div>
      )}
    </div>
  )
}

function PreviewTable({
  rows,
  editable,
  editableRows,
  onChange,
  onRemove,
}: {
  rows: WorkTimeCsvValidatedRow[]
  editable?: boolean
  editableRows?: EditableRow[]
  onChange?: (line: number, patch: Partial<EditableRow>) => void
  onRemove?: (line: number) => void
}) {
  const data = editable && editableRows ? editableRows : null
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="px-3 py-2 font-medium">行</th>
            <th className="px-3 py-2 font-medium">従業員番号</th>
            <th className="px-3 py-2 font-medium">氏名</th>
            <th className="px-3 py-2 font-medium">日付</th>
            <th className="px-3 py-2 font-medium">出勤</th>
            <th className="px-3 py-2 font-medium">退勤</th>
            <th className="px-3 py-2 font-medium">休日</th>
            <th className="px-3 py-2 font-medium">分</th>
            <th className="px-3 py-2 font-medium">エラー</th>
            {editable && onRemove && <th className="px-3 py-2 font-medium">操作</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const ed = data?.find((x) => x.line === r.line)
            return (
              <tr key={r.line} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono text-slate-500">{r.line}</td>
                <td className="px-3 py-2 font-mono">
                  {editable && ed && onChange ? (
                    <input
                      className="w-28 rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                      value={ed.employee_number}
                      onChange={(e) => onChange(r.line, { employee_number: e.target.value })}
                    />
                  ) : (
                    r.employee_number
                  )}
                </td>
                <td className="px-3 py-2">{r.employee_name ?? '—'}</td>
                <td className="px-3 py-2 font-mono">
                  {editable && ed && onChange ? (
                    <input
                      className="w-28 rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                      value={ed.record_date}
                      onChange={(e) => onChange(r.line, { record_date: e.target.value })}
                    />
                  ) : (
                    r.record_date
                  )}
                </td>
                <td className="px-3 py-2 font-mono">
                  {editable && ed && onChange ? (
                    <input
                      className="w-24 rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                      value={ed.start_time}
                      onChange={(e) => onChange(r.line, { start_time: e.target.value })}
                    />
                  ) : (
                    r.start_time
                  )}
                </td>
                <td className="px-3 py-2 font-mono">
                  {editable && ed && onChange ? (
                    <input
                      className="w-24 rounded border border-slate-200 px-2 py-1 font-mono text-xs"
                      value={ed.end_time}
                      onChange={(e) => onChange(r.line, { end_time: e.target.value })}
                    />
                  ) : (
                    r.end_time
                  )}
                </td>
                <td className="px-3 py-2">
                  {editable && ed && onChange ? (
                    <select
                      className="rounded border border-slate-200 px-2 py-1 text-xs"
                      value={ed.is_holiday}
                      onChange={(e) => onChange(r.line, { is_holiday: e.target.value })}
                    >
                      <option value="0">いいえ</option>
                      <option value="1">はい</option>
                    </select>
                  ) : r.is_holiday ? (
                    'はい'
                  ) : (
                    'いいえ'
                  )}
                </td>
                <td className="px-3 py-2">{r.duration_minutes ?? '—'}</td>
                <td className="px-3 py-2 text-red-600 max-w-[220px]">{r.error ?? '—'}</td>
                {editable && onRemove && (
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => onRemove(r.line)}
                    >
                      削除
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
