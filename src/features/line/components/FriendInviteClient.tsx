'use client'

/**
 * LINE友だち招待 — テナント管理者向けクライアントコンポーネント
 *
 * - 未連携従業員の一覧を DataTable で表示し、選択後に招待メールを送信する
 * - 「すべて / 未招待 / 招待済」ラジオで表示を絞り込み
 * - 送信結果（成功件数・失敗理由）をカード内にインライン表示する
 */

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, CheckCircle2, AlertCircle, Send } from 'lucide-react'
import TenantBackLink from '@/components/common/TenantBackLink'
import { DataTable } from '@/components/ui/DataTable'
import { sendFriendInvites } from '@/features/line/actions'
import type { FriendInviteCandidate, SendFriendInvitesResult } from '@/features/line/types'

/** 一覧フィルタ（ラジオ） */
type InviteFilter = 'all' | 'uninvited' | 'invited'

const FILTER_OPTIONS: { value: InviteFilter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'uninvited', label: '未招待' },
  { value: 'invited', label: '招待済' },
]

interface Props {
  /** 招待送信候補の従業員リスト */
  candidates: FriendInviteCandidate[]
}

export default function FriendInviteClient({ candidates }: Props) {
  const router = useRouter()
  // 選択中の従業員ID集合
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // 表示フィルタ（デフォルトはすべて）
  const [filter, setFilter] = useState<InviteFilter>('all')
  // 送信結果
  const [result, setResult] = useState<SendFriendInvitesResult | null>(null)
  // Server Action 実行中フラグ
  const [isPending, startTransition] = useTransition()
  // エラーメッセージ
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  /** フィルタ適用後の一覧 */
  const filteredCandidates = useMemo(() => {
    if (filter === 'uninvited') {
      return candidates.filter(c => c.inviteMailStatus === '未送信')
    }
    if (filter === 'invited') {
      return candidates.filter(c => c.inviteMailStatus === '送信済')
    }
    return candidates
  }, [candidates, filter])

  /** テーブル列定義（メールの直後に招待メール列） */
  const columns = [
    {
      key: 'name' as const,
      label: '氏名',
      sortable: true,
    },
    {
      key: 'email' as const,
      label: 'メール',
      sortable: false,
    },
    {
      key: 'inviteMailStatus' as const,
      label: '招待メール',
      sortable: true,
      render: (value: FriendInviteCandidate['inviteMailStatus']) => (
        <span
          className={
            value === '送信済' ? 'text-xs font-medium text-green-700' : 'text-xs text-slate-500'
          }
        >
          {value}
        </span>
      ),
    },
  ]

  /** フィルタ変更時は選択をクリア（非表示行が選ばれたまま残らないようにする） */
  const handleFilterChange = (next: InviteFilter) => {
    setFilter(next)
    setSelectedIds(new Set())
  }

  /** 招待メール送信ハンドラ */
  const handleSend = () => {
    if (selectedIds.size === 0) return
    setErrorMsg(null)
    setResult(null)
    startTransition(async () => {
      try {
        const res = await sendFriendInvites([...selectedIds])
        setResult(res)
        // 送信成功した分は選択解除し、招待状態を再取得
        if (res.sent > 0) {
          setSelectedIds(new Set())
          router.refresh()
        }
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : '送信中にエラーが発生しました')
      }
    })
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px]">
      {/* ヘッダー行: タイトル左、戻るリンク右（余分な行を追加しない） */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">LINE友だち招待</h1>
          <p className="mt-1 text-sm text-slate-500">
            まだLINE公式アカウントを友だち追加していない従業員に、招待メールを送信します。
          </p>
        </div>
        <TenantBackLink />
      </div>

      {/* メインカード */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4">
        {/* カードヘッダー + フィルタラジオ */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Mail className="w-5 h-5 text-[#FD7601] shrink-0" />
          <span className="font-semibold text-slate-800 text-sm">
            招待対象の従業員を選択してください
          </span>
          <fieldset className="flex items-center gap-3">
            <legend className="sr-only">招待状態で絞り込む</legend>
            {FILTER_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer"
              >
                <input
                  type="radio"
                  name="invite-filter"
                  value={opt.value}
                  checked={filter === opt.value}
                  onChange={() => handleFilterChange(opt.value)}
                  className="accent-[#FD7601]"
                />
                {opt.label}
              </label>
            ))}
          </fieldset>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-400">
              表示 {filteredCandidates.length} 名
              {filter !== 'all' ? ` / 未連携 ${candidates.length} 名` : ''}
            </span>
            <span className="text-xs text-slate-500">
              {selectedIds.size > 0 ? `${selectedIds.size} 名を選択中` : '従業員を選択してください'}
            </span>
            <button
              type="button"
              onClick={handleSend}
              disabled={selectedIds.size === 0 || isPending}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-[#FD7601] rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {isPending ? '送信中...' : '招待メールを送信'}
            </button>
          </div>
        </div>

        {/* 従業員テーブル */}
        <DataTable
          columns={columns}
          data={filteredCandidates}
          searchable
          searchPlaceholder="氏名・メールで検索..."
          searchKey="name"
          selectable
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          getRowId={item => item.employeeId}
          itemsPerPage={20}
        />

        {/* エラーメッセージ */}
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle className="mt-0.5 w-4 h-4 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}

        {/* 送信結果サマリー */}
        {result && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            {/* 成功件数 */}
            {result.sent > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                <p className="text-sm text-green-800 font-medium">
                  {result.sent} 件の招待メールを送信しました
                </p>
              </div>
            )}

            {/* 失敗リスト */}
            {result.failed.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <p className="text-sm text-amber-800 font-medium">
                    {result.failed.length} 件の送信に失敗しました
                  </p>
                </div>
                <ul className="space-y-1 pl-6">
                  {result.failed.map(f => (
                    <li key={f.employeeId} className="text-xs text-amber-700">
                      <span className="font-medium">{f.name || f.employeeId}</span>
                      {' — '}
                      {f.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
