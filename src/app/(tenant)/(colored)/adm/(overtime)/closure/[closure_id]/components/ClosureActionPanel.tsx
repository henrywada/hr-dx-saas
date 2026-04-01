'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '../timecard/components/textarea'

type Props = {
  closureId: string
  status: string | null | undefined
}

export function ClosureActionPanel({ closureId, status }: Props) {
  const router = useRouter()
  const s = status ?? 'open'
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [confirmAggOpen, setConfirmAggOpen] = useState(false)
  const [confirmApprOpen, setConfirmApprOpen] = useState(false)
  const [lockOpen, setLockOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [lockReason, setLockReason] = useState('')
  const [reopenComment, setReopenComment] = useState('')

  async function postJson(url: string, body?: object) {
    setError(null)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : '{}',
    })
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      throw new Error(json.error ?? '処理に失敗しました')
    }
    return json
  }

  async function run(
    key: string,
    action: () => Promise<void>,
  ) {
    setBusy(key)
    try {
      await action()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setBusy(null)
    }
  }

  const showAggregate = s !== 'locked' && s !== 'approved'
  const showApprove = s === 'aggregated'
  const showLock = s === 'approved'
  const showReopen = s === 'locked'

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {showAggregate && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={busy !== null}
            onClick={() => setConfirmAggOpen(true)}
          >
            {busy === 'agg' ? <Loader2 className="h-4 w-4 animate-spin" /> : '集計を実行'}
          </Button>
        )}
        {showApprove && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy !== null}
            onClick={() => setConfirmApprOpen(true)}
          >
            {busy === 'appr' ? <Loader2 className="h-4 w-4 animate-spin" /> : '承認'}
          </Button>
        )}
        {showLock && (
          <Button
            type="button"
            variant="warning"
            size="sm"
            disabled={busy !== null}
            onClick={() => setLockOpen(true)}
          >
            {busy === 'lock' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ロック'}
          </Button>
        )}
        {showReopen && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={() => setReopenOpen(true)}
          >
            {busy === 'reopen' ? <Loader2 className="h-4 w-4 animate-spin" /> : '締め取消し'}
          </Button>
        )}
      </div>

      <Dialog open={confirmAggOpen} onOpenChange={setConfirmAggOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>集計を実行しますか？</DialogTitle>
            <p className="text-sm text-neutral-500">勤怠・残業申請から再集計し、結果を保存します。</p>
          </DialogHeader>
          <div className="flex justify-end gap-2 px-6 pb-6">
            <Button type="button" variant="outline" onClick={() => setConfirmAggOpen(false)}>
              キャンセル
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={busy !== null}
              onClick={() => {
                void run('agg', async () => {
                  await postJson(`/api/closure/${closureId}/aggregate`)
                  setConfirmAggOpen(false)
                })
              }}
            >
              実行
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmApprOpen} onOpenChange={setConfirmApprOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>締めを承認しますか？</DialogTitle>
            <p className="text-sm text-neutral-500">集計結果を承認し、ロック可能な状態にします。</p>
          </DialogHeader>
          <div className="flex justify-end gap-2 px-6 pb-6">
            <Button type="button" variant="outline" onClick={() => setConfirmApprOpen(false)}>
              キャンセル
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={busy !== null}
              onClick={() => {
                void run('appr', async () => {
                  await postJson(`/api/closure/${closureId}/approve`)
                  setConfirmApprOpen(false)
                })
              }}
            >
              承認する
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={lockOpen} onOpenChange={setLockOpen}>
        <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>締めをロック</DialogTitle>
            <p className="text-sm text-neutral-500">必要に応じて理由を入力してください。</p>
          </DialogHeader>
          <form
            className="space-y-4 px-6 pb-6 pt-2 sm:px-8"
            onSubmit={(e) => {
              e.preventDefault()
              void run('lock', async () => {
                await postJson(`/api/closure/${closureId}/lock`, {
                  lock_reason: lockReason.trim() || undefined,
                })
                setLockOpen(false)
                setLockReason('')
              })
            }}
          >
            <Textarea
              placeholder="ロック理由（任意）"
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
              maxLength={2000}
              disabled={busy !== null}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLockOpen(false)} disabled={busy !== null}>
                キャンセル
              </Button>
              <Button type="submit" variant="warning" disabled={busy !== null}>
                {busy === 'lock' ? '処理中…' : 'ロックする'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>締め取消し</DialogTitle>
            <p className="text-sm text-neutral-500">締処理を取り消し、ロックを解除して未完了状態に戻します。</p>
          </DialogHeader>
          <form
            className="space-y-4 px-6 pb-6 pt-2 sm:px-8"
            onSubmit={(e) => {
              e.preventDefault()
              void run('reopen', async () => {
                await postJson(`/api/closure/${closureId}/reopen`, {
                  comment: reopenComment.trim() || undefined,
                })
                setReopenOpen(false)
                setReopenComment('')
              })
            }}
          >
            <Textarea
              placeholder="コメント（任意）"
              value={reopenComment}
              onChange={(e) => setReopenComment(e.target.value)}
              maxLength={2000}
              disabled={busy !== null}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setReopenOpen(false)} disabled={busy !== null}>
                キャンセル
              </Button>
              <Button type="submit" variant="primary" disabled={busy !== null}>
                {busy === 'reopen' ? '処理中…' : '締め取消しを実行'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
