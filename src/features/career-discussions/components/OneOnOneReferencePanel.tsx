'use client'

import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import type { OneOnOneSessionSummary } from '@/features/one-on-one/types'

interface Props {
  sessions: OneOnOneSessionSummary[]
  /** 記録時に 1on1 セッションを紐付ける場合 */
  selectable?: boolean
  selectedSessionId?: string
  onSelectSession?: (sessionId: string) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

export function OneOnOneReferencePanel({
  sessions,
  selectable = false,
  selectedSessionId = '',
  onSelectSession,
}: Props) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-500">
        直近の 1on1 記録はありません。
        <Link href={APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE} className="ml-1 text-[#FD7601] hover:underline">
          1on1 画面へ
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-600">直近の 1on1 記録（参照用）</p>
        <Link href={APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE} className="text-xs text-[#FD7601] hover:underline shrink-0">
          1on1 画面へ
        </Link>
      </div>
      <ul className="space-y-2">
        {sessions.map(s => (
          <li key={s.id} className="text-xs text-slate-600">
            {selectable && onSelectSession ? (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="oneOnOneSession"
                  checked={selectedSessionId === s.id}
                  onChange={() => onSelectSession(s.id)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium text-slate-800">{s.theme}</span>
                  <span className="text-slate-400 ml-1">({formatDate(s.conducted_at)} / {s.manager_name})</span>
                  {s.notes && <p className="mt-0.5 text-slate-500 line-clamp-2">{s.notes}</p>}
                </span>
              </label>
            ) : (
              <>
                <span className="font-medium text-slate-800">{s.theme}</span>
                <span className="text-slate-400 ml-1">({formatDate(s.conducted_at)} / {s.manager_name})</span>
                {s.notes && <p className="mt-0.5 text-slate-500 line-clamp-2">{s.notes}</p>}
              </>
            )}
          </li>
        ))}
      </ul>
      {selectable && onSelectSession && selectedSessionId && (
        <button
          type="button"
          onClick={() => onSelectSession('')}
          className="text-xs text-slate-500 hover:underline"
        >
          紐付けを解除
        </button>
      )}
    </div>
  )
}
