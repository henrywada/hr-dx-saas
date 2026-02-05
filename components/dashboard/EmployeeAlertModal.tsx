// components/dashboard/EmployeeAlertModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { X, TrendingDown, AlertCircle, User, MessageSquare } from 'lucide-react'
import {
  getEmployeePulseHistory,
  getAIAnalysisForEmployee,
  saveManagerComment,
  type AIAnalysis,
} from '@/app/dashboard/manager-alerts/actions'

interface EmployeeAlertModalProps {
  isOpen: boolean
  employeeId: string
  onClose: () => void
}

interface SessionWithComment {
  id: string
  overall_score: number
  feedback_comment?: string
  created_at: string
  pulse_intents?: {
    id: string
    label: string
  }
  manager_comment?: string | null
}

export function EmployeeAlertModal({ isOpen, employeeId, onClose }: EmployeeAlertModalProps) {
  const [sessions, setSessions] = useState<SessionWithComment[]>([])
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen || !employeeId) return

    async function loadData() {
      setIsLoading(true)
      try {
        const [sessionsData, analysisData] = await Promise.all([
          getEmployeePulseHistory(employeeId),
          getAIAnalysisForEmployee(employeeId),
        ])
        setSessions(sessionsData)

        setAnalysis(analysisData)
      } catch (error) {
        console.error('データ取得エラー:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [isOpen, employeeId])

  const handleSaveComment = async () => {
    if (!selectedSessionId || !comment.trim()) return

    setIsSaving(true)
    try {
      await saveManagerComment(selectedSessionId, comment.trim())
      
      // セッションリストを更新
      setSessions(prev =>
        prev.map(s =>
          s.id === selectedSessionId ? { ...s, manager_comment: comment.trim() } : s
        )
      )
      
      setComment('')
      setSelectedSessionId(null)
      alert('コメントを保存しました')
    } catch (error) {
      console.error('コメント保存エラー:', error)
      alert('コメントの保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  const severityColors = {
    critical: 'from-red-400 to-red-600',
    warning: 'from-orange-400 to-orange-600',
    attention: 'from-yellow-400 to-yellow-600',
  }

  const severityBgColors = {
    critical: 'bg-red-50',
    warning: 'bg-orange-50',
    attention: 'bg-yellow-50',
  }

  // グラフ用データ
  const chartData = sessions
    .slice(0, 5)
    .reverse()
    .map((s, index) => ({
      name: `${index + 1}回前`,
      score: s.overall_score,
      date: new Date(s.created_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
    }))

  const getScoreEmoji = (score: number) => {
    if (score >= 4) return '😆'
    if (score >= 3) return '😊'
    if (score >= 2) return '😐'
    return '😫'
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900">
              従業員詳細
            </h2>
            <span className="text-sm text-gray-500">ID: {employeeId.slice(0, 8)}...</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-6 p-6">
              {/* 左パネル: AI分析 */}
              <div className="space-y-6">
                {/* AI状況分析 */}
                {analysis && (
                  <div className={`rounded-xl p-6 ${severityBgColors[analysis.severity]}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <h3 className="text-lg font-bold text-gray-900">AI状況分析</h3>
                    </div>
                    <p className="text-sm text-red-700 font-bold mb-3">
                      {analysis.statusMessage}
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {analysis.detailedAnalysis}
                    </p>
                  </div>
                )}

                {/* 過去5回の推移グラフ */}
                <div className="bg-white rounded-xl p-6 border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingDown className="h-5 w-5 text-purple-600" />
                    <h3 className="text-lg font-bold text-gray-900">最近5回の推移</h3>
                  </div>
                  
                  {/* CSS/HTMLベースのバーチャート */}
                  <div className="relative h-40 flex items-end justify-around gap-3 px-4">
                    {chartData.map((item, index) => {
                      // スコアを数値に変換
                      const score = Number(item.score);
                      
                      // グラフコンテナの高さ（160px = h-40）
                      const containerHeight = 160;
                      // 高さをピクセルで計算、最低25px
                      const heightPx = Math.max((score / 5.0) * containerHeight, 25);
                      
                      const barColor = 
                        score >= 4 ? 'from-blue-400 to-blue-600' :
                        score >= 3 ? 'from-green-400 to-green-600' :
                        score >= 2 ? 'from-yellow-400 to-yellow-600' :
                        'from-red-400 to-red-600';
                      
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2">
                          {/* バー */}
                          <div 
                            className={`w-full rounded-t-lg bg-gradient-to-t ${barColor} relative group cursor-pointer transition-all hover:opacity-80 shadow-lg`}
                            style={{ height: `${heightPx}px` }}
                          >
                            {/* ホバー時のツールチップ */}
                            <div className="opacity-0 group-hover:opacity-100 absolute -top-16 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap transition-opacity shadow-xl z-10">
                              <div className="font-bold">{score.toFixed(1)}</div>
                              <div className="text-gray-300">{item.date}</div>
                              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                            </div>
                            
                            {/* スコア表示 */}
                            <div className="absolute top-2 left-0 right-0 text-center text-white font-bold text-sm drop-shadow-lg">
                              {score.toFixed(1)}
                            </div>
                          </div>
                          
                          {/* ラベル */}
                          <div className="text-xs text-gray-600 font-medium text-center whitespace-nowrap">
                            {item.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Y軸の目盛り */}
                  <div className="mt-4 flex items-center justify-between px-4 border-t border-gray-200 pt-3">
                    <div className="text-xs text-gray-500">スコア範囲: 1.0 - 5.0</div>
                    <div className="flex gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-gradient-to-t from-red-400 to-red-600"></div>
                        <span className="text-gray-600">低</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-gradient-to-t from-yellow-400 to-yellow-600"></div>
                        <span className="text-gray-600">中</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-gradient-to-t from-green-400 to-green-600"></div>
                        <span className="text-gray-600">良</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-gradient-to-t from-blue-400 to-blue-600"></div>
                        <span className="text-gray-600">優</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 推奨アクション */}
                {analysis && analysis.suggestions.length > 0 && (
                  <div className="bg-amber-50 rounded-xl p-6 border-2 border-amber-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">推奨アクション</h3>
                    <ul className="space-y-2">
                      {analysis.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="font-bold text-amber-600 shrink-0">●</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}


              </div>

              {/* 右パネル: 対話のヒント + 過去のパルス結果 */}
              <div className="space-y-6">
                {/* 対話のヒント */}
                {analysis && analysis.conversationHints.length > 0 && (
                  <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">対話のヒント</h3>
                    <ul className="space-y-2">
                      {analysis.conversationHints.map((hint, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="font-bold text-blue-600 shrink-0">•</span>
                          <span>{hint}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 上司コメント入力 */}
                {selectedSessionId && (
                  <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">💬 上司コメント</h3>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="コメントを入力..."
                      className="w-full h-32 px-4 py-3 border-2 border-blue-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm text-gray-700 placeholder-gray-400"
                    />
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={handleSaveComment}
                        disabled={isSaving || !comment.trim()}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {isSaving ? '保存中...' : '保存する'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSessionId(null)
                          setComment('')
                        }}
                        className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-all"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}

                {/* 過去のパルス結果 */}
                <div className="bg-white rounded-xl border-2 border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">過去のパルス結果</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">日付</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">テーマ</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">スコア</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">コメント</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">上司コメント</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sessions.slice(0, 30).map((session, index) => (
                          <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {new Date(session.created_at).toLocaleDateString('ja-JP')}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="group relative inline-flex items-center justify-center">
                                <MessageSquare className="h-5 w-5 text-purple-600 cursor-help" />
                                {/* ツールチップ */}
                                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg transition-opacity shadow-xl z-50 pointer-events-none min-w-[200px] max-w-[300px]">
                                  <div className="whitespace-normal leading-relaxed font-semibold">
                                    {session.pulse_intents?.label || 'テーマ情報が取得できませんでした'}
                                  </div>
                                  {/* 矢印 */}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-2xl">{getScoreEmoji(session.overall_score)}</span>
                                <span className="text-sm font-bold text-gray-900">
                                  {session.overall_score.toFixed(1)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">
                              {session.feedback_comment || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-blue-600 max-w-[150px] truncate cursor-pointer hover:underline"
                                onClick={() => {
                                  setSelectedSessionId(session.id)
                                  setComment(session.manager_comment || '')
                                }}
                            >
                              {session.manager_comment || '（クリックして追加）'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>


              </div>
            </div>
          </div>
        )}

        {/* フッター */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
