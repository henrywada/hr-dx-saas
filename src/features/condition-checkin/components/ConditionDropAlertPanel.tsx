import { AlertTriangle } from 'lucide-react'
import type { ConditionDropAlert } from '../types'

interface Props {
  alerts: ConditionDropAlert[]
}

const ALERT_LABEL: Record<ConditionDropAlert['alert_type'], string> = {
  week_drop: '7日間平均の急激な低下',
  consecutive_low: '低スコア（1〜2）の連続',
}

/** C-C1: 産業医・HR向けコンディション低下アラート一覧 */
export function ConditionDropAlertPanel({ alerts }: Props) {
  return (
    <div className="bg-white rounded-lg border border-rose-200 shadow-xs overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-rose-100 bg-rose-50/50 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
        <div>
          <h2 className="text-xs font-bold text-slate-800">コンディション低下アラート</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            7日間平均1.0以上の低下、または低スコア3日連続（産業医・HR向け）
          </p>
        </div>
      </div>
      {alerts.length === 0 ? (
        <p className="px-4 sm:px-5 py-4 text-xs text-slate-500">現在、該当するアラートはありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-4 py-2 font-semibold">従業員 / 部署</th>
                <th className="px-4 py-2 font-semibold">種別</th>
                <th className="px-4 py-2 font-semibold text-center">7日平均</th>
                <th className="px-4 py-2 font-semibold text-center">前週平均</th>
                <th className="px-4 py-2 font-semibold text-center">最新</th>
                <th className="px-4 py-2 font-semibold">最終記録日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alerts.map(alert => (
                <tr key={alert.employee_id} className="hover:bg-rose-50/30">
                  <td className="px-4 py-2">
                    <div className="font-semibold text-slate-800">{alert.employee_name}</div>
                    <div className="text-[11px] text-slate-400">{alert.division_name}</div>
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                      {ALERT_LABEL[alert.alert_type]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center font-mono">{alert.recent_avg ?? '—'}</td>
                  <td className="px-4 py-2 text-center font-mono">{alert.prior_avg ?? '—'}</td>
                  <td className="px-4 py-2 text-center font-bold text-rose-700">
                    {alert.latest_score ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{alert.latest_checkin_date ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
