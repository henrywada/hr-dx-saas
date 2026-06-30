import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { SessionRow, UpcomingOneOnOneRow } from '@/features/one-on-one/types'

interface Props {
  sessions: SessionRow[]
  upcoming: UpcomingOneOnOneRow[]
}

/** 従業員向け 1on1 履歴一覧（読み取り専用） */
export function MyOneOnOneListClient({ sessions, upcoming }: Props) {
  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <section className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2">
          <h2 className="text-sm font-semibold text-blue-900">予定されている 1on1</h2>
          <ul className="space-y-2">
            {upcoming.map(u => (
              <li key={u.id} className="rounded-lg bg-white border border-blue-100 px-3 py-2 text-sm">
                <div className="font-medium text-gray-900">{u.theme}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {format(new Date(u.scheduled_at), 'yyyy/MM/dd HH:mm', { locale: ja })} ／ 上長:{' '}
                  {u.manager_name}
                </div>
                {u.agenda && (
                  <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap border-t border-gray-100 pt-2">
                    {u.agenda}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-gray-400">
          <p className="text-sm text-gray-600">1on1 の記録はまだありません</p>
          <p className="text-xs mt-2 text-center text-gray-500 max-w-md">
            上長との 1on1 が実施されると、ここにテーマ・実施日・次回予定が表示されます。
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">実施日</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">上長</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">テーマ</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">次回予定</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">メモ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap text-gray-900">
                    {format(new Date(s.conducted_at), 'yyyy/MM/dd', { locale: ja })}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{s.manager_name}</td>
                  <td className="px-4 py-2 text-gray-900 font-medium">{s.theme}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-600">{s.next_date ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600 max-w-xs">
                    {s.notes ? (
                      <span className="line-clamp-2" title={s.notes}>
                        {s.notes}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
