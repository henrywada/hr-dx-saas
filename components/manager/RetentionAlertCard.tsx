// components/manager/RetentionAlertCard.tsx
"use client"

import React, { useEffect, useState } from 'react'
import { getRetentionAlerts } from '@/app/dashboard/actions'
import { AlertTriangle, CheckCircle, MessageSquare, Search, User, Tag, Info } from 'lucide-react'
import { ResponseDetailModal } from './ResponseDetailModal'

export function RetentionAlertCard() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // モーダル制御
  const [selectedAlert, setSelectedAlert] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    async function loadAlerts() {
      const data = await getRetentionAlerts()
      setAlerts(data)
      setLoading(false)
    }
    loadAlerts()
  }, [])

  const handleOpenDetail = (alert: any) => {
    setSelectedAlert(alert)
    setIsModalOpen(true)
  }

  // ★追加: 完了報告を受け取ってリストから削除する関数
  const handleResolveSuccess = () => {
    if (selectedAlert) {
        setAlerts((prev) => prev.filter(a => a.id !== selectedAlert.id))
    }
  }

  const getMoodIcon = (score: number) => {
    if (score <= 1) {
        return (
            <div className="h-9 w-9 rounded-full bg-red-100 border-2 border-white ring-2 ring-red-50 flex items-center justify-center text-2xl shadow-sm animate-in zoom-in spin-in-3">
                😫
            </div>
        )
    }
    if (score === 2) {
        return (
            <div className="h-9 w-9 rounded-full bg-orange-100 border-2 border-white ring-2 ring-orange-50 flex items-center justify-center text-2xl shadow-sm animate-in zoom-in">
                😓
            </div>
        )
    }
    return (
        <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <User size={18} />
        </div>
    )
  }

  if (loading) return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm animate-pulse h-20">
       <div className="h-full w-full bg-gray-50 rounded"></div>
    </div>
  )

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-green-100 bg-green-50/50 p-4 shadow-sm flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
          <CheckCircle size={16} />
        </div>
        <div>
           <span className="font-bold text-green-900 text-sm">状態良好</span>
           <span className="text-xs text-green-700 ml-2">離職リスクの高い従業員はいません。</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-red-200 bg-white shadow-sm overflow-hidden">
        {/* ヘッダー */}
        <div className="border-b border-red-100 bg-red-50/30 px-4 py-2 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={14} />
            <h3 className="font-bold text-red-900 text-xs">離職リスク・アラート</h3>
          </div>
          <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold">
            要対応 {alerts.length}件
          </span>
        </div>

        {/* 運用ガイド */}
        <div className="bg-blue-50/50 border-b border-blue-100/50 px-4 py-3 flex gap-3">
          <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 space-y-1">
            <p className="font-bold text-blue-800">
              💡 アラートの基準と対応について
            </p>
            <p className="leading-relaxed opacity-80">
              直近のパルス回答で<span className="font-bold text-red-600">「スコア 2 (微妙) 以下」</span>を記録したメンバーが表示されています。
              右側の<span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-600 align-middle mx-1"><Search size={10} /></span>ボタンから詳細を確認し、フォローを行ってください。
            </p>
          </div>
        </div>
        
        {/* リスト部分 */}
        <div className="divide-y divide-gray-50">
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              onClick={() => handleOpenDetail(alert)}
              className="group flex items-center gap-4 p-3 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              
              {/* 左：人物情報 */}
              <div className="w-48 shrink-0 flex items-center gap-3">
                {getMoodIcon(alert.score)}
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800 leading-none mb-1">{alert.name}</span>
                    <div className="flex items-center gap-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${alert.score === 1 ? 'bg-red-500' : 'bg-orange-400'}`}></span>
                        <span className="text-[10px] text-gray-500">スコア: {alert.score}</span>
                    </div>
                </div>
              </div>

              {/* 中：理由＋コメント */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="shrink-0 inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                    <Tag size={10} />
                    {alert.reason}
                  </span>

                  <div className="flex items-center gap-2 bg-gray-50/50 rounded-md px-3 py-1 border border-transparent group-hover:bg-white group-hover:border-gray-200 transition-colors flex-1 min-w-0">
                      <MessageSquare size={12} className="text-gray-400 shrink-0" />
                      <span className="text-xs text-gray-600 truncate font-medium">
                          {alert.comment ? alert.comment : <span className="text-gray-400 italic">コメントなし</span>}
                      </span>
                  </div>
              </div>

              {/* 右：日付＆アクション */}
              <div className="shrink-0 flex items-center gap-4 text-right">
                  <span className="text-[10px] text-gray-400 font-mono">{alert.date}</span>
                  <div className="h-7 w-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm hover:bg-blue-100 hover:border-blue-200 hover:scale-105 transition-all">
                      <Search size={14} />
                  </div>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* 詳細モーダル */}
      <ResponseDetailModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        alert={selectedAlert}
        onResolve={handleResolveSuccess} // ★ここを繋ぎました
      />
    </>
  )
}