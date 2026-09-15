'use client'

// 件名マスタ管理モーダル（is_manager のみが開くボタンを見られる前提。
// 開閉制御自体は呼び出し元の PictureReportForm 側で is_manager 判定して行う）
import { Pencil, Plus, Tag, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { createSubject, updateSubject, deleteSubject } from '@/features/picture-report/actions'
import type { PictureSendSubject } from '@/features/picture-report/types'

interface SubjectManageModalProps {
  open: boolean
  subjects: PictureSendSubject[]
  onClose: () => void
  onSubjectsChanged: () => void
}

type EditMode = { kind: 'none' } | { kind: 'add' } | { kind: 'edit'; id: string; label: string }

export function SubjectManageModal({
  open,
  subjects,
  onClose,
  onSubjectsChanged,
}: SubjectManageModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<EditMode>({ kind: 'none' })
  const [draftLabel, setDraftLabel] = useState('')
  const [saving, setSaving] = useState(false)

  // `open` の変化に応じてフォーム状態をリセットする。
  // useEffect + setState はカスケードレンダーを招くため
  // （react-hooks/set-state-in-effect）、Reactが推奨する
  // 「レンダー中にpropsの変化を検知してstateを調整する」パターンを使う
  // （https://react.dev/learn/you-might-not-need-an-effect）
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setEditMode({ kind: 'none' })
      setDraftLabel('')
      setError(null)
    }
  }

  if (!open) return null

  async function handleSave() {
    const trimmed = draftLabel.trim()
    if (!trimmed) {
      setError('件名を入力してください。')
      return
    }

    setSaving(true)
    setError(null)

    const result =
      editMode.kind === 'edit'
        ? await updateSubject({ id: editMode.id, label: trimmed })
        : await createSubject({ label: trimmed })

    setSaving(false)

    // 注意: discriminated union に対する `!result.success` の否定narrowingが
    // 本プロジェクトのTypeScript環境で正しく機能しないため `=== false` で判定する
    if (result.success === false) {
      setError(result.error)
      return
    }

    setEditMode({ kind: 'none' })
    setDraftLabel('')
    onSubjectsChanged()
  }

  async function handleDelete(id: string, label: string) {
    if (!window.confirm(`「${label}」を削除しますか？`)) return

    setError(null)
    const result = await deleteSubject({ id })

    if (result.success === false) {
      setError(result.error)
      return
    }

    if (editMode.kind === 'edit' && editMode.id === id) {
      setEditMode({ kind: 'none' })
      setDraftLabel('')
    }
    onSubjectsChanged()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subject-modal-title"
    >
      <div className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2
            id="subject-modal-title"
            className="flex items-center gap-2 text-base font-semibold text-gray-900"
          >
            <Tag className="h-4 w-4 text-primary" strokeWidth={1.75} />
            件名マスタ管理
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(85vh-8rem)] overflow-y-auto px-4 py-4">
          <p className="text-sm text-gray-500">
            部門で繰り返し使う件名（例:
            日報）を登録します。ここで登録した件名は同じ部門のメンバー全員が選択できます。
          </p>

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {editMode.kind !== 'none' && (
            <div className="mt-4 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
              <label className="block text-sm font-medium text-gray-900">
                {editMode.kind === 'add' ? '新規件名' : '件名を変更'}
              </label>
              <input
                type="text"
                value={draftLabel}
                onChange={e => setDraftLabel(e.target.value)}
                placeholder="例: 日報"
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSave()}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setEditMode({ kind: 'none' })
                    setDraftLabel('')
                    setError(null)
                  }}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-900 transition hover:border-primary/50"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={editMode.kind !== 'none'}
            onClick={() => {
              setEditMode({ kind: 'add' })
              setDraftLabel('')
              setError(null)
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-primary/40 px-3 py-2 text-sm font-medium text-primary transition hover:border-primary disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            件名を追加
          </button>

          <ul className="mt-4 space-y-2">
            {subjects.length === 0 && (
              <li className="text-sm text-gray-500">登録済みの件名はありません。</li>
            )}
            {subjects.map(subject => (
              <li
                key={subject.id}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-gray-900">
                  {subject.label}
                </span>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={editMode.kind !== 'none'}
                    onClick={() => {
                      setEditMode({ kind: 'edit', id: subject.id, label: subject.label })
                      setDraftLabel(subject.label)
                      setError(null)
                    }}
                    className="rounded-md p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-primary disabled:opacity-50"
                    aria-label={`${subject.label} を編集`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={editMode.kind !== 'none'}
                    onClick={() => void handleDelete(subject.id, subject.label)}
                    className="rounded-md p-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    aria-label={`${subject.label} を削除`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
