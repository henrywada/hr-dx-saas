// components/dashboard/ManagerAlertBanner.tsx
'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { getManagerAlerts, type ManagerAlert } from '@/app/dashboard/manager-alerts/actions'
import { EmployeeAlertModal } from '@/components/dashboard/EmployeeAlertModal'

export function ManagerAlertBanner() {
  const [alerts, setAlerts] = useState<ManagerAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  const fetchAlerts = async () => {
    try {
      setIsLoading(true)
      const data = await getManagerAlerts()
      setAlerts(data)
    } catch (error) {
      console.error('アラート取得エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  // ローディング中または部下がいない場合は非表示
  if (isLoading || alerts.length === 0 || isDismissed) {
    return null
  }

  const criticalCount = alerts.filter(a => a.analysis.severity === 'critical').length
  const warningCount = alerts.filter(a => a.analysis.severity === 'warning').length

  return (
    <>
      <div className="mb-6 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 p-6 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="flex-shrink-0 mt-1">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span>対応が必要な皆様がいます。内容をご確認ください。</span>
                {criticalCount > 0 && (
                  <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                    緊急 {criticalCount}名
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
                    警告 {warningCount}名
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                （氏名をクリックして詳細をご覧ください）
              </p>

              <div className="space-y-2">
                {alerts.map((alert) => {
                  const severityColors = {
                    critical: 'bg-red-50 border-red-300 hover:bg-red-100',
                    warning: 'bg-orange-50 border-orange-300 hover:bg-orange-100',
                    attention: 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100',
                  }
                  
                  const textColors = {
                    critical: 'text-red-800',
                    warning: 'text-orange-800',
                    attention: 'text-yellow-800',
                  }

                  return (
                    <button
                      key={alert.employee.id}
                      onClick={() => setSelectedEmployeeId(alert.employee.id)}
                      className={`w-full px-4 py-3 border-2 rounded-lg text-left transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm ${
                        severityColors[alert.analysis.severity]
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${textColors[alert.analysis.severity]}`}>
                          氏名:
                        </span>
                        <span className="font-bold text-gray-900">
                          {alert.employee.name}
                        </span>
                        <span className="text-gray-400">-</span>
                        <span className={`text-sm ${textColors[alert.analysis.severity]}`}>
                          {alert.analysis.statusMessage}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsDismissed(true)}
            className="flex-shrink-0 ml-4 p-2 rounded-full hover:bg-orange-100 transition-colors text-gray-500 hover:text-gray-700"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {selectedEmployeeId && (
        <EmployeeAlertModal
          isOpen={!!selectedEmployeeId}
          employeeId={selectedEmployeeId}
          onClose={() => setSelectedEmployeeId(null)}
        />
      )}
    </>
  )
}
