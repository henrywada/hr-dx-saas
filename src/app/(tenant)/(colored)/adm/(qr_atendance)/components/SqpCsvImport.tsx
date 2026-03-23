'use client'

import { createClient } from '@/lib/supabase/client'
import { APP_ROUTES } from '@/config/routes'
import Link from 'next/link'
import { useCallback, useState } from 'react'
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

const FN_NAME = 'qr-admin-bulkimportpermissions'
const MAX_BYTES = 5 * 1024 * 1024

const TEMPLATE =
  'supervisor_employee_number,employee_number,can_display,scope\n' +
  'A123,B456,1,qr_display\n' +
  'A123,C789,1,qr_display\n'

export type SqpBulkImportDetail = {
  line: number
  supervisor_employee_number: string
  employee_number: string
  result: 'ok' | 'error'
  reason?: string
}

export type SqpBulkImportResponse = {
  summary: { total: number; success: number; failed: number }
  details: SqpBulkImportDetail[]
  error?: string
}

export function SqpCsvImport() {
  const supabase = createClient()
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [result, setResult] = useState<SqpBulkImportResponse | null>(null)

  const validateAndSetFile = useCallback((f: File | null) => {
    setMessage(null)
    setResult(null)
    if (!f) {
      setFile(null)
      return
    }
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setMessage('拡張子は .csv のみ対応しています。')
      setFile(null)
      return
    }
    if (f.size > MAX_BYTES) {
      setMessage('ファイルサイズは 5MB 以下にしてください。')
      setFile(null)
      return
    }
    setFile(f)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const f = e.dataTransfer.files[0]
      if (f) validateAndSetFile(f)
    },
    [validateAndSetFile],
  )

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'supervisor_qr_permissions_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const submit = async () => {
    if (!file) {
      setMessage('CSV ファイルを選択してください。')
      return
    }
    setLoading(true)
    setMessage(null)
    setResult(null)

    const { data: userData, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userData.user) {
      setLoading(false)
      setMessage('ログインセッションを確認できません。再ログインしてください。')
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) {
      setLoading(false)
      setMessage('アクセストークンを取得できませんでした。')
      return
    }

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? ''
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
    const url = `${base}/functions/v1/${FN_NAME}`

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anon,
        },
        body: form,
      })

      const json = (await res.json()) as SqpBulkImportResponse

      if (!res.ok) {
        setMessage(json.error ? `エラー: ${json.error}` : `HTTP ${res.status}`)
        setResult(json.summary ? json : null)
        setLoading(false)
        return
      }

      setResult(json)
      if (json.summary.failed > 0) {
        setMessage('一部の行で失敗しました。下表を確認してください。')
      } else {
        setMessage(null)
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '通信に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href={APP_ROUTES.TENANT.ADMIN_QR_ATENDANCE}
          className="text-sm text-slate-600 hover:text-accent-orange underline-offset-2 hover:underline"
        >
          QR 表示権限一覧へ戻る
        </Link>
        <button
          type="button"
          onClick={downloadTemplate}
          className="text-sm font-medium text-accent-orange hover:underline"
        >
          テンプレートCSVをダウンロード
        </button>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? 'border-accent-orange bg-orange-50/50' : 'border-slate-200 bg-slate-50/80'
        }`}
      >
        <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-400 mb-3" />
        <p className="text-sm text-slate-600 mb-2">
          CSV をドラッグ＆ドロップするか、ファイルを選択してください（UTF-8、5MB 以下、.csv）
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm border border-slate-200 hover:bg-slate-50">
          <Upload className="h-4 w-4" />
          ファイルを選択
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {file && (
          <p className="mt-3 text-xs text-slate-500 font-mono">{file.name}</p>
        )}
      </div>

      <button
        type="button"
        disabled={loading || !file}
        onClick={() => void submit()}
        className="inline-flex items-center gap-2 rounded-lg bg-accent-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 disabled:pointer-events-none hover:opacity-95"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            アップロード中…
          </>
        ) : (
          'アップロードして取り込む'
        )}
      </button>

      {message && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium text-slate-800">
              処理件数: {result.summary.total} / 成功: {result.summary.success} / 失敗:{' '}
              {result.summary.failed}
            </span>
          </div>

          {result.details.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">行</th>
                    <th className="px-3 py-2 font-medium">監督者番号</th>
                    <th className="px-3 py-2 font-medium">従業員番号</th>
                    <th className="px-3 py-2 font-medium">結果</th>
                    <th className="px-3 py-2 font-medium">理由</th>
                  </tr>
                </thead>
                <tbody>
                  {result.details.map((d) => (
                    <tr
                      key={`${d.line}-${d.supervisor_employee_number}-${d.employee_number}`}
                      className="border-t border-slate-100"
                    >
                      <td className="px-3 py-2 font-mono">{d.line}</td>
                      <td className="px-3 py-2 font-mono">{d.supervisor_employee_number}</td>
                      <td className="px-3 py-2 font-mono">{d.employee_number}</td>
                      <td className="px-3 py-2">
                        {d.result === 'ok' ? (
                          <span className="text-emerald-700">ok</span>
                        ) : (
                          <span className="text-red-600">error</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{d.reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
