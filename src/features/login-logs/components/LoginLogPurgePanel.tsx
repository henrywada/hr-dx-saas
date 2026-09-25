'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { previewPurgeLoginLogs, purgeLoginLogs } from '../actions'

const PURGE_MONTH_COUNT = 24
const ERR_NETWORK = '通信に失敗しました。ページを再読み込みして結果を確認してください。'
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 当月（JST）を除く過去24ヶ月の選択肢（新しい順） */
function buildOptions(): { value: string; label: string }[] {
  const jst = new Date(Date.now() + JST_OFFSET_MS)
  const curY = jst.getUTCFullYear()
  const curM = jst.getUTCMonth() + 1
  const options: { value: string; label: string }[] = []
  for (let i = 1; i <= PURGE_MONTH_COUNT; i++) {
    const d = new Date(Date.UTC(curY, curM - 1 - i, 1))
    const y = d.getUTCFullYear()
    const m = d.getUTCMonth() + 1
    options.push({ value: `${y}-${String(m).padStart(2, '0')}`, label: `${y}年${m}月` })
  }
  return options
}

function formatLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `${Number(y)}年${Number(m)}月1日`
}

export function LoginLogPurgePanel() {
  const options = buildOptions()
  const [ym, setYm] = useState(options[0].value)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewYm, setPreviewYm] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [isPending, startTransition] = useTransition()

  const resetPreview = () => {
    setPreviewCount(null)
    setPreviewYm(null)
  }

  const handlePreview = () => {
    setMessage(null)
    resetPreview()
    startTransition(async () => {
      try {
        const res = await previewPurgeLoginLogs(ym)
        if (res.success) {
          setPreviewCount(res.count ?? 0)
          setPreviewYm(ym)
        } else {
          setMessage({ type: 'error', text: res.error ?? '対象件数の取得に失敗しました。' })
        }
      } catch {
        resetPreview()
        setMessage({ type: 'error', text: ERR_NETWORK })
      }
    })
  }

  const handlePurge = () => {
    if (isPending || !previewYm) return
    const target = previewYm
    startTransition(async () => {
      try {
        const res = await purgeLoginLogs(target)
        setIsDialogOpen(false)
        setTyped('')
        resetPreview()
        if (res.success) {
          setMessage({
            type: 'success',
            text: `${formatLabel(target)}より前のログイン履歴を ${(res.count ?? 0).toLocaleString()} 件削除しました。`,
          })
        } else {
          setMessage({ type: 'error', text: res.error ?? 'ログイン履歴の削除に失敗しました。' })
        }
      } catch {
        setIsDialogOpen(false)
        setTyped('')
        resetPreview()
        setMessage({ type: 'error', text: ERR_NETWORK })
      }
    })
  }

  const canDelete = previewCount !== null && previewCount > 0 && previewYm === ym

  return (
    <section className="rounded-xl border border-red-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Trash2 className="w-4 h-4 text-red-600" />
        <h2 className="text-sm font-bold text-red-700">ログイン履歴の一括削除</h2>
      </div>
      <p className="text-sm text-[#57606a]">
        指定した年月の1日 0:00（JST）より前のログイン履歴を、全テナント分削除します。指定した月は残ります。
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={ym}
          onChange={e => {
            setYm(e.target.value)
            resetPreview()
            setMessage(null)
          }}
          disabled={isPending}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[9rem]"
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handlePreview}
          disabled={isPending}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          削除対象を確認
        </button>
      </div>

      {previewCount !== null && previewYm && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-[#24292f]">
            {formatLabel(previewYm)}より前のログ{' '}
            <span className="font-bold">{previewCount.toLocaleString()}件</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setTyped('')
              setIsDialogOpen(true)
            }}
            disabled={!canDelete || isPending}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            削除する
          </button>
        </div>
      )}

      {message && (
        <p
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-700'}`}
        >
          {message.text}
        </p>
      )}

      {isDialogOpen && previewYm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="purge-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 space-y-4 shadow-xl">
            <h3 id="purge-dialog-title" className="text-base font-bold text-red-700">
              ログイン履歴の削除の確認
            </h3>
            <p className="text-sm text-[#24292f]">
              {formatLabel(previewYm)}より前のログイン履歴 {previewCount?.toLocaleString()} 件を削除します。この操作は取り消せません。
            </p>
            <div className="space-y-1">
              <label htmlFor="purge-confirm" className="text-sm text-[#57606a]">
                確認のため対象年月「{previewYm}」を入力してください
              </label>
              <input
                id="purge-confirm"
                type="text"
                value={typed}
                onChange={e => setTyped(e.target.value)}
                autoComplete="off"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDialogOpen(false)}
                disabled={isPending}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handlePurge}
                disabled={typed !== previewYm || isPending}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? '削除中...' : '削除を実行'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
