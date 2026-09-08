'use client'

import { useEffect, useState, useTransition } from 'react'
import { createWorkLog, deleteWorkLog, getTaskWorkLogsAction, updateWorkLog } from '../actions'
import type { TaskWorkLog } from '../types'

interface WorkLogSectionProps {
  taskId: string
  /** このユーザーが自分の工数を記録できるか（グループ参加者または担当者本人。RLSが最終防衛） */
  canLogWork: boolean
  /** 閲覧者本人の従業員ID（編集・削除可否の判定に使う。従業員レコード無しユーザーは null） */
  currentEmployeeId: string | null
}

export function WorkLogSection({ taskId, canLogWork, currentEmployeeId }: WorkLogSectionProps) {
  const [logs, setLogs] = useState<TaskWorkLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function reload() {
    setIsLoading(true)
    startTransition(async () => {
      try {
        const data = await getTaskWorkLogsAction({ taskId })
        setLogs(data)
        setLoadError(null)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : '工数記録の取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    })
  }

  useEffect(() => {
    reload()
    // taskId は呼び出し元から固定値として渡される想定のため、マウント時のみ実行する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalHours = logs.reduce((sum, log) => sum + log.hours, 0)

  return (
    <div className="space-y-2">
      {isLoading && <p className="text-xs text-slate-400">読み込み中...</p>}
      {loadError && <p className="text-xs text-red-600">{loadError}</p>}
      {!isLoading && logs.length === 0 && (
        <p className="text-xs text-slate-400">工数記録はまだありません。</p>
      )}
      {logs.length > 0 && <p className="text-xs text-slate-500">合計: {totalHours}時間</p>}
      <ul className="space-y-1">
        {logs.map(log => (
          <WorkLogItem
            key={log.id}
            log={log}
            onChanged={reload}
            currentEmployeeId={currentEmployeeId}
          />
        ))}
      </ul>
      {canLogWork && <WorkLogForm taskId={taskId} onPosted={reload} />}
    </div>
  )
}

interface WorkLogItemProps {
  log: TaskWorkLog
  onChanged: () => void
  currentEmployeeId: string | null
}

function WorkLogItem({ log, onChanged, currentEmployeeId }: WorkLogItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [workDate, setWorkDate] = useState(log.workDate)
  const [hours, setHours] = useState(String(log.hours))
  const [note, setNote] = useState(log.note ?? '')
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isOwnLog = currentEmployeeId !== null && log.employeeId === currentEmployeeId

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    setActionError(null)
    startTransition(async () => {
      try {
        await updateWorkLog({
          workLogId: log.id,
          workDate,
          hours: Number(hours),
          note: note || undefined,
        })
        setIsEditing(false)
        onChanged()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : '工数記録の編集に失敗しました')
      }
    })
  }

  function handleDelete() {
    if (!window.confirm('この工数記録を削除しますか？')) return
    setActionError(null)
    startTransition(async () => {
      try {
        await deleteWorkLog({ workLogId: log.id })
        onChanged()
      } catch (err) {
        setActionError(err instanceof Error ? err.message : '工数記録の削除に失敗しました')
      }
    })
  }

  if (isEditing) {
    return (
      <li className="rounded-lg border border-slate-200 p-2">
        <form onSubmit={handleSaveEdit} className="space-y-1">
          <div className="flex gap-2">
            <input
              type="date"
              value={workDate}
              onChange={e => setWorkDate(e.target.value)}
              required
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
            />
            <input
              type="number"
              min="0.25"
              max="24"
              step="0.25"
              value={hours}
              onChange={e => setHours(e.target.value)}
              required
              className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs"
            />
          </div>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="メモ"
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
          />
          {actionError && <p className="text-xs text-red-600">{actionError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending || !hours}
              className="rounded-lg bg-[#FD7601] px-2 py-1 text-[10px] font-medium text-white disabled:opacity-50"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-[10px] text-slate-500"
            >
              キャンセル
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-xs">
      <div>
        <span className="font-medium text-slate-900">{log.workDate}</span>
        <span className="ml-2 text-slate-600">{log.hours}時間</span>
        <span className="ml-2 text-slate-400">{log.employeeName}</span>
        {log.note && <p className="mt-0.5 text-slate-500">{log.note}</p>}
        {actionError && <p className="mt-0.5 text-red-600">{actionError}</p>}
      </div>
      {isOwnLog && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-[10px] text-slate-500"
          >
            編集
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-[10px] text-red-500 disabled:opacity-50"
          >
            削除
          </button>
        </div>
      )}
    </li>
  )
}

interface WorkLogFormProps {
  taskId: string
  onPosted: () => void
}

function WorkLogForm({ taskId, onPosted }: WorkLogFormProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [workDate, setWorkDate] = useState(today)
  const [hours, setHours] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await createWorkLog({
          taskId,
          workDate,
          hours: Number(hours),
          note: note || undefined,
        })
        setHours('')
        setNote('')
        onPosted()
      } catch (err) {
        setError(err instanceof Error ? err.message : '工数記録の登録に失敗しました')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="date"
          value={workDate}
          onChange={e => setWorkDate(e.target.value)}
          required
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
        />
        <input
          type="number"
          min="0.25"
          max="24"
          step="0.25"
          value={hours}
          onChange={e => setHours(e.target.value)}
          required
          placeholder="時間"
          className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs"
        />
      </div>
      <input
        type="text"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="メモ（任意）"
        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending || !hours}
        className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        工数を記録する
      </button>
    </form>
  )
}
