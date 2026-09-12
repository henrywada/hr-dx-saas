'use client'

import { useState } from 'react'
import { ListTodo, Users } from 'lucide-react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { toJSTDateString } from '@/lib/datetime'
import type { Task } from '../types'
import type { TaskActionSection } from './TaskActionModal'
import { ProgressRing } from './ProgressRing'

interface SimpleTaskCardProps {
  task: Task
  employeeNameById: Record<string, string>
  /** タスク責任者のとき true（進捗・工数・コメント・メンバー・削除） */
  isResponsible: boolean
  /** 目標責任者のとき true（コメント投稿のみ。責任者と兼任なら責任者側の全ボタンを優先） */
  isObjectiveOwner: boolean
  /** 削除処理中など、フッター操作を一時的に無効化する */
  disabled?: boolean
  onOpenSection: (section: TaskActionSection) => void
  onDelete: () => void
}

const STATUS_LABEL: Record<Task['status'], string> = {
  todo: '未着手',
  in_progress: '進行中',
  review: 'レビュー',
  done: '完了',
  blocked: '保留',
}

/** 期限ラベルの緊急度（2週間以内は赤、1ヶ月以内は黄、それ以外は緑） */
type DueUrgency = 'ok' | 'warn' | 'danger'

function getDueUrgency(dueDate: string): DueUrgency {
  // JST の「今日」との暦日差。期限超過（負）も2週間以内と同様に赤扱いにする
  const daysLeft = differenceInCalendarDays(parseISO(dueDate), parseISO(toJSTDateString()))
  if (daysLeft <= 14) return 'danger'
  if (daysLeft <= 30) return 'warn'
  return 'ok'
}

const DUE_URGENCY_CLASS: Record<DueUrgency, string> = {
  ok: 'bg-(--success-bg) text-(--green-600)',
  warn: 'bg-amber-50 text-amber-600',
  danger: 'bg-red-50 text-red-600',
}

const footerBtnClass =
  'rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-[#f6f8fa] disabled:opacity-50'

/** 目標詳細ページのタスクカード（Phase5シンプルUI用）。 */
export function SimpleTaskCard({
  task,
  employeeNameById,
  isResponsible,
  isObjectiveOwner,
  disabled = false,
  onOpenSection,
  onDelete,
}: SimpleTaskCardProps) {
  const [isMemberListOpen, setIsMemberListOpen] = useState(false)
  const responsibleName = task.responsibleEmployeeId
    ? (employeeNameById[task.responsibleEmployeeId] ?? task.responsibleEmployeeId)
    : '未設定'
  const dueUrgency = task.dueDate ? getDueUrgency(task.dueDate) : null
  const memberCount = task.memberEmployeeIds.length

  // タスク責任者: 全アクション、目標責任者のみ: コメント投稿だけ
  const showFullActions = isResponsible
  const showCommentOnly = isObjectiveOwner && !isResponsible
  const showFooter = showFullActions || showCommentOnly

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-xs">
      <p className="flex items-center gap-1.5 truncate border-b border-slate-200 px-3 py-2 text-xs font-medium text-slate-900">
        <ListTodo className="h-3.5 w-3.5 shrink-0 text-[#FD7601]" strokeWidth={2} />
        <span className="truncate">{task.title}</span>
      </p>
      {/* /tasks の ObjectiveCard と同様、左に詳細・右に進捗リング */}
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0 flex-1 space-y-1.5 text-xs text-slate-500">
          {task.goalSummary && <p className="truncate">タスク名: {task.goalSummary}</p>}
          {task.dueDate && dueUrgency && (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-[15px] font-bold ${DUE_URGENCY_CLASS[dueUrgency]}`}
            >
              期限: {task.dueDate}
            </span>
          )}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>責任者: {responsibleName}</span>
            {/* 閲覧者全員がメンバー一覧を開ける（登録操作は「メンバー登録」ボタン側） */}
            <button
              type="button"
              onClick={() => setIsMemberListOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-1.5 py-0.5 text-xs text-slate-600 hover:bg-[#f6f8fa]"
              aria-label={`メンバー一覧を表示（${memberCount}名）`}
            >
              <Users className="h-3.5 w-3.5 text-[#FD7601]" strokeWidth={2} />
              メンバー数: {memberCount}
            </button>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <ProgressRing progress={task.progressPercent} size={56} />
          <p className="text-[10px] text-slate-500">ステータス: {STATUS_LABEL[task.status]}</p>
        </div>
      </div>
      {showFooter && (
        <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-slate-200 px-3 py-2">
          {showFullActions && (
            <>
              <button
                type="button"
                onClick={() => onOpenSection('status')}
                disabled={disabled}
                className={footerBtnClass}
              >
                進捗ステータス
              </button>
              <button
                type="button"
                onClick={() => onOpenSection('workLog')}
                disabled={disabled}
                className={footerBtnClass}
              >
                工数記録
              </button>
            </>
          )}
          {(showFullActions || showCommentOnly) && (
            <button
              type="button"
              onClick={() => onOpenSection('comment')}
              disabled={disabled}
              className={footerBtnClass}
            >
              コメント投稿
            </button>
          )}
          {showFullActions && (
            <>
              <button
                type="button"
                onClick={() => onOpenSection('members')}
                disabled={disabled}
                className={footerBtnClass}
              >
                メンバー登録
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={disabled}
                className="rounded-lg border border-red-200 px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                削除
              </button>
            </>
          )}
        </div>
      )}

      {isMemberListOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setIsMemberListOpen(false)}
        >
          <div
            className="max-h-[70vh] w-full max-w-sm overflow-y-auto rounded-lg bg-white p-4 shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">メンバー一覧</h2>
                <p className="mt-0.5 text-xs text-slate-600">
                  <span className="text-slate-500">タスク名：</span>
                  {task.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMemberListOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-700">メンバー：{memberCount}名</p>
            <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {memberCount === 0 ? (
                <li className="px-3 py-2 text-xs text-slate-400">メンバーはまだいません</li>
              ) : (
                task.memberEmployeeIds.map(id => (
                  <li key={id} className="px-3 py-2 text-xs text-slate-700">
                    {employeeNameById[id] ?? id}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
