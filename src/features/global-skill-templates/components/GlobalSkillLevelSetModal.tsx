'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GlobalJobCategory, GlobalJobRole, GlobalJobRoleDetail } from '../types'
import { loadGlobalJobRoleDetailAction } from '../actions'
import { GlobalSkillLevelSetWorkspace } from './GlobalSkillLevelSetWorkspace'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles: GlobalJobRole[]
  categories: GlobalJobCategory[]
  selectedCategoryId: string | null
}

type RoleGroup = {
  categoryId: string
  categoryName: string
  roles: GlobalJobRole[]
}

/** GlobalJobRoleList と同じ並びで業種グループを構築（セレクトの optgroup 用） */
function buildRoleGroups(
  filtered: GlobalJobRole[],
  categories: GlobalJobCategory[],
  selectedCategoryId: string | null
): RoleGroup[] {
  const catOrder = [...categories].sort((a, b) => a.sort_order - b.sort_order)
  const orderIds = selectedCategoryId
    ? catOrder.filter(c => c.id === selectedCategoryId).map(c => c.id)
    : catOrder.map(c => c.id)
  const nameById = new Map(categories.map(c => [c.id, c.name]))

  return orderIds
    .map(categoryId => {
      const list = filtered
        .filter(r => r.category_id === categoryId)
        .sort((a, b) => a.sort_order - b.sort_order)
      return {
        categoryId,
        categoryName: nameById.get(categoryId) ?? '—',
        roles: list,
      }
    })
    .filter(g => g.roles.length > 0)
}

/** 一覧と同じフィルター後の職種集合 */
function filteredRoles(
  roles: GlobalJobRole[],
  selectedCategoryId: string | null
): GlobalJobRole[] {
  return selectedCategoryId ? roles.filter(r => r.category_id === selectedCategoryId) : roles
}

/**
 * 職種一覧から開く「スキルレベルセット登録」モーダル。
 * 詳細モーダルの「スキルレベル」ブロックのみを切り出したもの。
 */
export function GlobalSkillLevelSetModal({
  open,
  onOpenChange,
  roles,
  categories,
  selectedCategoryId,
}: Props) {
  const listFiltered = useMemo(
    () => filteredRoles(roles, selectedCategoryId),
    [roles, selectedCategoryId]
  )
  const groups = useMemo(
    () => buildRoleGroups(listFiltered, categories, selectedCategoryId),
    [listFiltered, categories, selectedCategoryId]
  )

  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [detail, setDetail] = useState<GlobalJobRoleDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const selectedRoleIdRef = useRef(selectedRoleId)
  selectedRoleIdRef.current = selectedRoleId

  useEffect(() => {
    if (!open) {
      setDetail(null)
      setSelectedRoleId('')
      return
    }
    if (listFiltered.length === 0) {
      setSelectedRoleId('')
      return
    }
    setSelectedRoleId(prev =>
      prev && listFiltered.some(r => r.id === prev) ? prev : listFiltered[0].id
    )
  }, [open, listFiltered])

  const loadDetail = useCallback(async (roleId: string) => {
    if (!roleId) return
    const rid = roleId
    setLoading(true)
    try {
      const d = await loadGlobalJobRoleDetailAction(rid)
      if (selectedRoleIdRef.current !== rid) return
      setDetail(d)
    } finally {
      if (selectedRoleIdRef.current === rid) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open || !selectedRoleId) return
    void loadDetail(selectedRoleId)
  }, [open, selectedRoleId, loadDetail])

  const handleMutationSuccess = useCallback(() => {
    void loadDetail(selectedRoleId)
  }, [loadDetail, selectedRoleId])

  const roleMeta = listFiltered.find(r => r.id === selectedRoleId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 shadow-lg [&>button]:text-white [&>button]:hover:bg-white/15 [&>button]:hover:text-white [&>button]:focus-visible:ring-white/40"
        closeButtonClassName="text-white hover:bg-white/15 hover:text-white focus-visible:ring-white/40"
      >
        <DialogHeader className="shrink-0 rounded-t-xl border-0 bg-primary px-6 pb-4 pt-5 pr-14 text-white sm:px-8 sm:pb-5 sm:pt-6 sm:pr-16">
          <DialogTitle className="text-lg font-semibold text-white sm:text-xl">
            スキルレベルセット登録
          </DialogTitle>
          <DialogPrimitive.Description className="mt-1 text-sm leading-snug text-white/90">
            対象の職種を選び、スキルレベルセットとセット内のレベルを登録・編集します。変更は保存後すぐにテナント側の取り込みに反映されます。
          </DialogPrimitive.Description>
          {roleMeta && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold"
                style={{
                  backgroundColor: roleMeta.color_hex + '33',
                  color: roleMeta.color_hex,
                  border: `1px solid ${roleMeta.color_hex}88`,
                }}
              >
                {roleMeta.name}
              </span>
              <span className="text-sm text-white/85">
                {categories.find(c => c.id === roleMeta.category_id)?.name ?? '—'}
              </span>
            </div>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5 [scrollbar-gutter:stable]">
          {listFiltered.length === 0 ? (
            <p className="text-center text-sm text-gray-500">
              職種がありません。先に職種を追加してください。
            </p>
          ) : (
            <>
              <div className="mb-4">
                <label htmlFor="skill-level-set-role" className="text-xs font-semibold text-gray-700">
                  対象職種
                </label>
                <select
                  id="skill-level-set-role"
                  value={selectedRoleId}
                  onChange={e => setSelectedRoleId(e.target.value)}
                  className="mt-1 w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                >
                  {selectedCategoryId != null
                    ? groups.flatMap(g =>
                        g.roles.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))
                      )
                    : groups.map(g => (
                        <optgroup key={g.categoryId} label={g.categoryName}>
                          {g.roles.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                </select>
              </div>

              {loading && !detail ? (
                <p className="text-center text-sm text-gray-500">読み込み中…</p>
              ) : !detail || detail.id !== selectedRoleId ? (
                <p className="text-center text-sm text-red-600">
                  職種を読み込めませんでした。別の職種を選ぶか、閉じてから再度お試しください。
                </p>
              ) : (
                <GlobalSkillLevelSetWorkspace
                  jobRoleId={detail.id}
                  skillLevelSets={detail.skillLevelSets}
                  onMutationSuccess={handleMutationSuccess}
                />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
