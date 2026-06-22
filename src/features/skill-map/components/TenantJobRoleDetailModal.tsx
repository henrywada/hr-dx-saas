'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useCallback, useEffect, useState, useTransition } from 'react'
import type { TenantSkillDetail, SkillRequirement } from '../types'
import { loadTenantSkillDetailAction, updateTenantSkill, deleteSkillRequirement } from '../actions'
import { SkillRequirementModal } from './SkillRequirementModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  skillId: string | null
}

export function TenantJobRoleDetailModal({ open, onOpenChange, skillId }: Props) {
  const router = useRouter()
  const [detail, setDetail] = useState<TenantSkillDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const [editingMeta, setEditingMeta] = useState(false)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [metaError, setMetaError] = useState<string | null>(null)
  const [isPendingMeta, startMeta] = useTransition()

  const [reqModalOpen, setReqModalOpen] = useState(false)
  const [editingReq, setEditingReq] = useState<SkillRequirement | undefined>(undefined)
  const [isPendingDel, startDel] = useTransition()

  const loadDetail = useCallback(async () => {
    if (!skillId) return
    setLoading(true)
    try {
      const d = await loadTenantSkillDetailAction(skillId)
      setDetail(d)
    } finally {
      setLoading(false)
    }
  }, [skillId])

  useEffect(() => {
    if (!open) {
      setDetail(null)
      setEditingMeta(false)
      return
    }
    void loadDetail()
  }, [open, loadDetail])

  function handleReqClose() {
    setReqModalOpen(false)
    setEditingReq(undefined)
    void loadDetail()
    router.refresh()
  }

  function handleDeleteReq(req: SkillRequirement) {
    if (!confirm(`「${req.name}」を削除しますか？`)) return
    startDel(async () => {
      await deleteSkillRequirement(req.id)
      void loadDetail()
      router.refresh()
    })
  }

  function handleSaveMeta() {
    if (!detail || !editName.trim()) return
    startMeta(async () => {
      const res = await updateTenantSkill({
        id: detail.id,
        name: editName.trim(),
        colorHex: editColor,
      })
      if ('error' in res) {
        setMetaError(res.error)
        return
      }
      setEditingMeta(false)
      setMetaError(null)
      void loadDetail()
      router.refresh()
    })
  }

  const isPending = isPendingMeta || isPendingDel

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 shadow-lg [&>button]:text-white [&>button]:hover:bg-white/15 [&>button]:hover:text-white [&>button]:focus-visible:ring-white/40"
          closeButtonClassName="text-white hover:bg-white/15 hover:text-white focus-visible:ring-white/40"
        >
          <DialogHeader className="shrink-0 rounded-t-xl border-0 bg-primary px-6 pb-4 pt-5 pr-14 text-white sm:px-8 sm:pb-5 sm:pt-6 sm:pr-16">
            <DialogTitle className="text-lg font-semibold text-white sm:text-xl">
              職種詳細
            </DialogTitle>
            <DialogPrimitive.Description className="mt-1 text-sm leading-snug text-white/90">
              この職種のスキル要件（スキル名・レベル・達成基準）を編集します。
            </DialogPrimitive.Description>
            {detail && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold"
                  style={{
                    backgroundColor: detail.color_hex + '33',
                    color: detail.color_hex,
                    border: `1px solid ${detail.color_hex}88`,
                  }}
                >
                  {detail.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditName(detail.name)
                    setEditColor(detail.color_hex)
                    setEditingMeta(true)
                  }}
                  className="rounded-md bg-white/15 px-2 py-0.5 text-xs text-white hover:bg-white/25"
                >
                  ✏️ 編集
                </button>
              </div>
            )}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5 [scrollbar-gutter:stable]">
            {loading && !detail ? (
              <p className="text-center text-sm text-gray-500">読み込み中…</p>
            ) : !detail ? (
              <p className="text-center text-sm text-red-600">
                データを読み込めませんでした。閉じてから再度お試しください。
              </p>
            ) : (
              <div className="space-y-6">
                {editingMeta && (
                  <div className="rounded-lg border border-primary/30 bg-[#f6f8fa] px-4 py-4">
                    {metaError && <p className="mb-3 text-sm text-red-600">{metaError}</p>}
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="職種名"
                        autoFocus
                        className="min-w-[160px] flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                      />
                      <div className="flex gap-1">
                        {COLORS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColor(c)}
                            className="h-6 w-6 rounded-full border-2 transition-all"
                            style={{
                              backgroundColor: c,
                              borderColor: editColor === c ? '#374151' : 'transparent',
                            }}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveMeta}
                        disabled={isPending || !editName.trim()}
                        className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMeta(false)
                          setMetaError(null)
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-800">スキル要件</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingReq(undefined)
                        setReqModalOpen(true)
                      }}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                    >
                      ＋ 要件を追加
                    </button>
                  </div>

                  {detail.requirements.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
                      <p className="text-sm text-gray-400">まだ要件が登録されていません</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-gray-200">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">
                              スキル名
                            </th>
                            <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">
                              カテゴリ
                            </th>
                            <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">
                              レベル
                            </th>
                            <th className="border-b border-gray-200 px-4 py-2.5 text-center text-xs font-semibold text-gray-700">
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.requirements.map((req, idx) => (
                            <tr
                              key={req.id}
                              className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                            >
                              <td className="px-4 py-2.5 text-sm text-gray-800">{req.name}</td>
                              <td className="px-4 py-2.5">
                                {req.category ? (
                                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                    {req.category}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {req.level ? (
                                  <span
                                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                                    style={{
                                      backgroundColor: req.level.color_hex + '22',
                                      color: req.level.color_hex,
                                      border: `1px solid ${req.level.color_hex}66`,
                                    }}
                                  >
                                    {req.level.name}
                                  </span>
                                ) : (
                                  <span className="text-xs text-amber-600">未設定</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingReq(req)
                                      setReqModalOpen(true)
                                    }}
                                    className="text-xs text-primary hover:underline"
                                  >
                                    編集
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteReq(req)}
                                    disabled={isPending}
                                    className="text-xs text-gray-400 hover:text-red-600 hover:underline disabled:opacity-50"
                                  >
                                    削除
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {detail && reqModalOpen && (
        <SkillRequirementModal
          skillId={detail.id}
          skillName={detail.name}
          levels={detail.levels}
          editing={editingReq}
          onClose={handleReqClose}
        />
      )}
    </>
  )
}
