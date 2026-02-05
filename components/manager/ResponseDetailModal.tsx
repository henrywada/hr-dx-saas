// components/manager/ResponseDetailModal.tsx
"use client"

import React, { useEffect, useState, useMemo } from 'react'
import { User, X, Calendar, Tag, MessageSquare, CheckCircle2, HeartHandshake, TrendingUp, PenLine, Lightbulb, AlertCircle } from 'lucide-react'
import { getEmployeeHistory, markAlertAsResolved, getEmployeeResolvedHistory } from '@/app/dashboard/actions'

interface ResponseDetailModalProps {
  isOpen: boolean
  onClose: () => void
  alert: any
  onResolve: () => void
}

export function ResponseDetailModal({ isOpen, onClose, alert, onResolve }: ResponseDetailModalProps) {
  const [history, setHistory] = useState<any[]>([])
  const [resolvedHistory, setResolvedHistory] = useState<any[]>([])
  const [isResolving, setIsResolving] = useState(false)
  const [note, setNote] = useState('')
  const [activeTab, setActiveTab] = useState<'action' | 'history'>('action')

  useEffect(() => {
    if (isOpen && alert?.employeeId) {
      getEmployeeHistory(alert.employeeId).then(data => setHistory(data))
      getEmployeeResolvedHistory(alert.employeeId).then(data => setResolvedHistory(data))
      setNote('')
      setActiveTab('action')
    }
  }, [isOpen, alert])

  // --- ロジック部分 ---

  // 1. AIによる状況分析ロジック（履歴データから自動生成）
  const aiAnalysis = useMemo(() => {
    if (!history || history.length === 0) return { text: "データ分析中...", color: "bg-gray-100 border-gray-200 text-gray-600" };

    const scores = history.map(h => Number(h.score) || 0);
    const latestScore = scores[scores.length - 1]; // 配列の最後が最新
    
    // 過去データ（今回以外）
    const pastScores = scores.slice(0, scores.length - 1);
    const pastAvg = pastScores.length > 0 ? pastScores.reduce((a, b) => a + b, 0) / pastScores.length : latestScore;

    if (latestScore <= 1) {
        return { 
            text: "⚠️ スコアが危険域(1)に達しています。ご本人への早急かつ丁寧なケアを強く推奨します。", 
            color: "bg-red-50 border-red-200 text-red-800" 
        };
    }
    
    if (latestScore === 2) {
        // 過去平均も低い場合（2.5以下）→ 慢性
        if (pastAvg <= 2.5 && pastScores.length >= 2) {
            return { 
                text: "🔴 低いスコアが慢性的に続いています。一時的な不調ではなく、根本的な課題解決が必要かもしれません。", 
                color: "bg-red-50 border-red-200 text-red-800"
            };
        } 
        // 前回より急に下がった場合（0.5ポイント以上低下）→ 急変
        else if (latestScore < pastAvg - 0.5 && pastScores.length > 0) {
            return { 
                text: "📉 直近でスコアが低下傾向にあります。何か突発的な変化やトラブルがなかったか確認してください。", 
                color: "bg-orange-50 border-orange-200 text-orange-800"
            };
        }
        // それ以外
        return { 
            text: "今回のスコアは低調(2)です。理由やコメントを確認し、慎重なフォローをお願いします。", 
            color: "bg-orange-50 border-orange-200 text-orange-800"
        };
    }

    return { text: "直近のスコア推移に基づく特記事項はありません。", color: "bg-gray-50 border-gray-200 text-gray-600" };
  }, [history]);

  // 2. 推奨アクション切り替えロジック
  const getSuggestedActions = (reason: string) => {
    if (!reason) return ['1on1面談を設定し、話を聞く', '業務状況の確認']
    if (reason.includes('業務量') || reason.includes('残業')) return ['タスクの優先順位を整理する', 'チーム内での業務分担を見直す', '一時的な業務量の調整を提案する']
    if (reason.includes('人間関係') || reason.includes('ハラスメント')) return ['別室で個別に事実確認を行う', '人事部門へ相談・連携する', '席替えやチーム配置の変更を検討する']
    if (reason.includes('評価') || reason.includes('待遇')) return ['評価フィードバックの時間を設ける', '期待役割と現状のギャップを擦り合わせる', 'キャリアプランについてヒアリングする']
    if (reason.includes('健康') || reason.includes('体調')) return ['産業医との面談を案内する', '有給休暇の取得を推奨する', '業務時間を短縮・調整する']
    return ['1on1面談を設定し、話を聞く', '直近の業務や生活の変化を尋ねる']
  }
  const actions = alert ? getSuggestedActions(alert.reason) : []

  // 3. メモ入力補助・完了処理
  const handleCheckboxChange = (text: string, checked: boolean) => {
    if (checked) setNote(prev => prev ? `${prev}\n・${text}` : `・${text}`)
  }
  const handleResolve = async () => {
    if (!confirm('このアラートを「対応済み」にして、リストから消去しますか？')) return
    setIsResolving(true)
    try {
        await markAlertAsResolved(alert.id, note)
        onResolve()
        onClose()
    } catch (e) { alert('エラーが発生しました') } finally { setIsResolving(false) }
  }

  if (!isOpen || !alert) return null

  // --- JSX部分 ---
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      {/* モーダル幅を広げる: max-w-5xl */}
      <div className="relative w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-gray-900/5 transition-all animate-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col">
        
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500">
                <User size={20} />
             </div>
             <div>
                <h2 className="text-lg font-bold text-gray-800 leading-none">{alert.name}</h2>
                <p className="text-xs text-gray-500 mt-1">ID: {alert.id.slice(0, 8)}...</p>
             </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-200 transition-colors"><X size={20} /></button>
        </div>

        {/* コンテンツエリア：2カラムレイアウトに変更 */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 h-full items-start">
            
            {/* === 左カラム：状況 === */}
            <div className="space-y-6 flex flex-col h-full">
               
               {/* 1. 今回の回答概要 */}
               <div className="bg-white rounded-lg p-5 border-2 border-red-100 shadow-sm shrink-0">
                  <div className="flex items-center justify-between mb-4">
                     <span className="text-sm font-bold text-red-700 bg-red-50 px-3 py-1 rounded-full flex items-center gap-1">
                        <AlertCircle size={14} /> 今回のアラート ({alert.date})
                     </span>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-4">
                      <div>
                          <p className="text-xs text-gray-500 font-bold mb-1">スコア</p>
                          <div className="flex items-end gap-1">
                              <span className={`text-3xl font-black leading-none ${alert.score <= 1 ? 'text-red-600' : 'text-orange-500'}`}>{alert.score}</span>
                              <span className="text-sm text-gray-400 font-bold mb-1">/ 5</span>
                          </div>
                      </div>
                      <div>
                          <p className="text-xs text-gray-500 font-bold mb-2">主な要因</p>
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 border border-gray-200 px-3 py-1.5 text-sm font-bold text-gray-700">
                              <Tag size={14} /> {alert.reason}
                          </span>
                      </div>
                  </div>
                  {alert.comment && (
                    <div className="flex gap-3 bg-gray-50 p-3 rounded-md border border-gray-200/50 italic relative mt-2">
                        <MessageSquare size={14} className="text-gray-400 shrink-0 mt-1 absolute left-3 top-3" />
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-all pl-6">
                            "{alert.comment}"
                        </p>
                    </div>
                  )}
               </div>

               {/* 1-2. 質問文 */}
               {(alert.reasonQuestion || alert.commentQuestion) && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 shadow-sm shrink-0">
                     <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                        <MessageSquare size={16} className="text-blue-600" />
                        質問文
                     </h3>
                     <div className="space-y-2">
                        {alert.reasonQuestion && (
                           <div className="bg-white p-3 rounded border border-blue-100">
                              <p className="text-xs text-blue-600 font-medium mb-1">🔹 理由</p>
                              <p className="text-sm text-gray-700">{alert.reasonQuestion}</p>
                           </div>
                        )}
                        {alert.commentQuestion && (
                           <div className="bg-white p-3 rounded border border-blue-100">
                              <p className="text-xs text-blue-600 font-medium mb-1">🔹 コメント</p>
                              <p className="text-sm text-gray-700">{alert.commentQuestion}</p>
                           </div>
                        )}
                     </div>
                  </div>
               )}

               {/* 2. 直近のスコア推移 */}
               <div className="shrink-0">
                  <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                     <TrendingUp size={18} className="text-indigo-600" /> 直近5回の推移
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 h-40 flex items-end justify-between gap-2">
                     {history.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">読み込み中...</div>
                     ) : (
                        history.map((record, index) => {
                           const score = Number(record.score) || 0
                           const barHeightPx = Math.max((score / 5) * 100, 4)
                           let barColor = score >= 4 ? '#60a5fa' : score === 3 ? '#facc15' : '#f87171'
                           const [dateStr, timeStr] = record.date ? record.date.split(' ') : ['-', '']
                           return (
                             <div key={index} className="flex-1 flex flex-col items-center gap-2 group relative">
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-200 z-10 whitespace-nowrap">{score}</div>
                                <div className="w-full max-w-[24px] rounded-t-sm hover:opacity-80 transition-all" style={{ height: `${barHeightPx}px`, backgroundColor: barColor }} />
                                <div className="text-[9px] text-gray-400 font-mono text-center leading-tight"><div>{dateStr}</div><div className="opacity-70 text-[8px]">{timeStr}</div></div>
                             </div>
                           )
                        })
                     )}
                  </div>
               </div>

               {/* 3. [新機能] AI状況分析コメント */}
               <div className={`rounded-lg p-4 border ${aiAnalysis.color} flex-1`}>
                  <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                     <Lightbulb size={16} /> AI状況分析
                  </h4>
                  <p className="text-sm leading-relaxed font-medium opacity-90">
                    {aiAnalysis.text}
                  </p>
               </div>
            </div>

            {/* === 右カラム：対応 === */}
            <div className="space-y-6 flex flex-col h-full overflow-y-auto px-1">
               
               {/* タブUI */}
               <div className="flex border-b border-gray-200 shrink-0">
                  <button
                     onClick={() => setActiveTab('action')}
                     className={`px-4 py-2 text-sm font-bold transition-colors ${
                        activeTab === 'action'
                           ? 'border-b-2 border-indigo-600 text-indigo-600'
                           : 'text-gray-500 hover:text-gray-700'
                     }`}
                  >
                     アクションを取る
                  </button>
                  <button
                     onClick={() => setActiveTab('history')}
                     className={`px-4 py-2 text-sm font-bold transition-colors ${
                        activeTab === 'history'
                           ? 'border-b-2 border-indigo-600 text-indigo-600'
                           : 'text-gray-500 hover:text-gray-700'
                     }`}
                  >
                     アクション履歴を見る
                  </button>
               </div>

               {/* タブコンテンツ */}
               {activeTab === 'action' ? (
                  <>
               {/* 4. 推奨アクション */}
               <div className="shrink-0">
                  <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                     <CheckCircle2 size={18} className="text-indigo-600" /> 推奨アクション ({alert.reason}編)
                  </h3>
                  <div className="space-y-2 bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50">
                     {actions.map((actionText, idx) => (
                        <label key={idx} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white cursor-pointer transition-colors group">
                            <input type="checkbox" className="h-4 w-4 mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0" onChange={(e) => handleCheckboxChange(actionText, e.target.checked)} />
                            <span className="text-sm text-gray-700 font-medium group-hover:text-indigo-800 transition-colors leading-snug">{actionText}</span>
                        </label>
                     ))}
                  </div>
               </div>

               {/* 5. 対応メモ */}
               <div className="bg-white p-4 rounded-xl border-2 border-indigo-100 shadow-sm shrink-0">
                  <h3 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                     <PenLine size={16} /> 対応メモ（備忘録）
                  </h3>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="アクションをチェックすると自動転記されます。手入力も可能です。"
                    className="w-full h-32 p-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none placeholder:text-gray-400"
                  />
               </div>

               {/* 6. 対話のヒント */}
               <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex-1">
                  <h4 className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-2">
                     <HeartHandshake size={14} /> 対話のヒント
                  </h4>
                  <ul className="text-xs text-amber-900 space-y-2 list-disc list-inside opacity-90 leading-relaxed">
                     <li>「なぜ？」と原因を追及するより、<span className="font-bold underline decoration-amber-500/50">「どうすれば解決できそう？」</span>と未来志向で問いかけましょう。</li>
                     <li>まずは「不調を教えてくれてありがとう」と<span className="font-bold">感謝</span>を伝え、心理的安全性を作ることが最優先です。</li>
                     <li>解決を急がず、本人の話に耳を傾ける「傾聴」の姿勢が信頼関係を築きます。</li>
                  </ul>
               </div>
               </>
            ) : (
               /* アクション履歴テーブル（対応済みのみ） */
               <div className="overflow-auto flex-1">
                  <table className="w-full border-collapse text-sm">
                     <thead className="bg-gray-50 sticky top-0">
                        <tr className="border-b border-gray-200">
                           <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">日付</th>
                           <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">スコア</th>
                           <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">主な要因</th>
                           <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">コメント</th>
                           <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">上司コメント</th>
                        </tr>
                     </thead>
                     <tbody>
                        {resolvedHistory.length === 0 ? (
                           <tr>
                              <td colSpan={5} className="px-3 py-12 text-center text-gray-400 text-sm">
                                 <div className="flex flex-col items-center gap-2">
                                    <CheckCircle2 size={32} className="text-gray-300" />
                                    <p>対応済みの履歴がありません</p>
                                 </div>
                              </td>
                           </tr>
                        ) : (
                           resolvedHistory.map((record) => (
                              <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                 <td className="px-3 py-3 text-xs text-gray-700 font-mono whitespace-nowrap">
                                    {record.date}
                                 </td>
                                 <td className="px-3 py-3">
                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                       record.score <= 1 ? 'bg-red-100 text-red-700' :
                                       record.score === 2 ? 'bg-orange-100 text-orange-700' :
                                       record.score === 3 ? 'bg-yellow-100 text-yellow-700' :
                                       'bg-blue-100 text-blue-700'
                                    }`}>
                                       {record.score}
                                    </span>
                                 </td>
                                 <td className="px-3 py-3 text-xs text-gray-700">
                                    <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs">
                                       <Tag size={10} />
                                       {record.reason}
                                    </span>
                                 </td>
                                 <td className="px-3 py-3 text-xs text-gray-600 max-w-xs">
                                    <div className="line-clamp-2" title={record.comment}>
                                       {record.comment || <span className="text-gray-400 italic">未記入</span>}
                                    </div>
                                 </td>
                                 <td className="px-3 py-3 text-xs text-indigo-700 max-w-xs font-medium">
                                    <div className="line-clamp-2" title={record.resolutionNote}>
                                       {record.resolutionNote || <span className="text-gray-400 italic">未記入</span>}
                                    </div>
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>
            )}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 shrink-0 border-t border-gray-100">
           <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 transition-colors">閉じる</button>
           <button onClick={handleResolve} disabled={isResolving || !note} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2">
             <CheckCircle2 size={18} /> {isResolving ? '保存中...' : '対応を完了する'}
           </button>
        </div>

      </div>
    </div>
  )
}