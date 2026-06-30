import type { ElXapiStatementRow } from '../scorm-queries'

interface Props {
  statements: ElXapiStatementRow[]
}

function verbLabel(verbId: string): string {
  if (verbId.includes('completed')) return '完了'
  if (verbId.includes('passed')) return '合格'
  if (verbId.includes('failed')) return '不合格'
  return verbId.split('/').pop() ?? verbId
}

export function XapiStatementsPanel({ statements }: Props) {
  if (statements.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="text-sm font-bold text-gray-900 mb-2">xAPI ステートメント（LRS ライト）</h2>
        <p className="text-xs text-gray-500">まだ記録がありません（SCORM 修了時に自動記録されます）</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs space-y-3">
      <h2 className="text-sm font-bold text-gray-900">xAPI ステートメント（LRS ライト）</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-1 pr-3">日時</th>
              <th className="py-1 pr-3">verb</th>
              <th className="py-1 pr-3">activity</th>
              <th className="py-1">score</th>
            </tr>
          </thead>
          <tbody>
            {statements.map(s => (
              <tr key={s.id} className="border-b border-gray-50">
                <td className="py-1.5 pr-3 whitespace-nowrap">
                  {new Date(s.recorded_at).toLocaleString('ja-JP')}
                </td>
                <td className="py-1.5 pr-3">{verbLabel(s.verb_id)}</td>
                <td className="py-1.5 pr-3 max-w-xs truncate">{s.activity_id ?? '—'}</td>
                <td className="py-1.5">{s.result_score ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
