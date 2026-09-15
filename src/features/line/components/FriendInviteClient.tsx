'use client'

/**
 * LINE友だち招待 — テナント管理者向けクライアントコンポーネント
 *
 * - 未連携従業員の一覧を DataTable で表示し、選択後に招待メールを送信する
 * - 送信結果（成功件数・失敗理由）をカード内にインライン表示する
 */

import { useState, useTransition } from 'react'
import { Mail, CheckCircle2, AlertCircle, Send } from 'lucide-react'
import TenantBackLink from '@/components/common/TenantBackLink'
import { DataTable } from '@/components/ui/DataTable'
import { sendFriendInvites } from '@/features/line/actions'
import type { FriendInviteCandidate, SendFriendInvitesResult } from '@/features/line/types'

interface Props {
  /** 招待送信候補の従業員リスト */
  candidates: FriendInviteCandidate[]
}

export default function FriendInviteClient({ candidates }: Props) {
  // 選択中の従業員ID集合
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  // 送信結果
  const [result, setResult] = useState<SendFriendInvitesResult | null>(null)
  // Server Action 実行中フラグ
  const [isPending, startTransition] = useTransition()
  // エラーメッセージ
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  /** テーブル列定義 */
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
  ]

  /** 招待メール送信ハンドラ */
  const handleSend = () => {
    if (selectedIds.size === 0) return
    setErrorMsg(null)
    setResult(null)
    startTransition(async () => {
      try {
        const res = await sendFriendInvites([...selectedIds])
        setResult(res)
        // 送信成功した分は選択解除
        if (res.sent > 0) {
          setSelectedIds(new Set())
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
        {/* カードヘッダー */}
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-[#FD7601]" />
          <span className="font-semibold text-slate-800 text-sm">
            招待対象の従業員を選択してください
          </span>
          <span className="ml-auto text-xs text-slate-400">未連携 {candidates.length} 名</span>
        </div>

        {/* 従業員テーブル */}
        <DataTable
          columns={columns}
          data={candidates}
          searchable
          searchPlaceholder="氏名・メールで検索..."
          searchKey="name"
          selectable
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          getRowId={item => item.employeeId}
          itemsPerPage={20}
        />

        {/* 送信ボタン */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">
            {selectedIds.size > 0 ? `${selectedIds.size} 名を選択中` : '従業員を選択してください'}
          </span>
          <button
            type="button"
            onClick={handleSend}
            disabled={selectedIds.size === 0 || isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#FD7601] rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            {isPending ? '送信中...' : '招待メールを送信'}
          </button>
        </div>

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
