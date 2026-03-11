'use client'

import { useState } from 'react'
import { CandidatePulse } from '@/features/candidate-pulse/types'
import { createTenantPulse, createAndSendPulseRequest } from '@/features/candidate-pulse/actions'

export const PulseDashboardUI = ({ initialPulses }: { initialPulses: CandidatePulse[] }) => {
  const [pulses, setPulses] = useState<CandidatePulse[]>(initialPulses)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [candidateName, setCandidateName] = useState('')
  const [selectionStep, setSelectionStep] = useState('')
  const [candidateEmail, setCandidateEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [issueUrl, setIssueUrl] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setToastMessage(null)
    setIssueUrl('')
    try {
      if (candidateEmail) {
        // メール自動送信フロー
        const res = await createAndSendPulseRequest({
          candidate_name: candidateName,
          candidate_email: candidateEmail,
          selection_step: selectionStep,
        })
        if (res.success && res.id) {
          setToastMessage(`通知完了: ${candidateName} 様へアンケートを送信しました`)
          setPulses([{
            id: res.id,
            tenant_id: 'dummy',
            candidate_name: candidateName,
            selection_step: selectionStep,
            sentiment_score: null,
            concerns: [],
            comment: null,
            is_answered: false,
            created_at: new Date().toISOString(),
          }, ...pulses])
          // モーダルを閉じてリセット
          setTimeout(() => {
            setIsModalOpen(false)
            setCandidateName('')
            setCandidateEmail('')
            setSelectionStep('')
            setToastMessage(null)
          }, 3000)
        }
      } else {
        // URL発行のみフロー
        const res = await createTenantPulse({
          candidate_name: candidateName,
          selection_step: selectionStep,
        })
        if (res.success && res.id) {
          const url = `${window.location.origin}/p/pulse/${res.id}`
          setIssueUrl(url)
          setPulses([{
            id: res.id,
            tenant_id: 'dummy',
            candidate_name: candidateName,
            selection_step: selectionStep,
            sentiment_score: null,
            concerns: [],
            comment: null,
            is_answered: false,
            created_at: new Date().toISOString(),
          }, ...pulses])
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message || 'エラーが発生しました。')
      } else {
        alert('予期せぬエラーが発生しました。')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // アラート候補者（回答済みでスコアが2以下）
  const alertPulses = pulses.filter(
    (p) => p.is_answered && p.sentiment_score !== null && p.sentiment_score <= 2
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">候補者の現在の気持ちを見える化し、辞退リスクを低減します。</p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition"
        >
          アンケートを新規発行
        </button>
      </div>

      {alertPulses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-red-600 mb-3 flex items-center gap-2">
            ⚠️ アラート（スコア2以下）
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alertPulses.map((p) => {
              const template = p.pulse_templates
              const q1Text = template?.question_1_text || '今のお気持ちを5段階で教えてください'
              const q2Text = template?.question_2_text || '懸念点やもっと知りたいことがあれば選択してください'
              const q3Text = template?.question_3_text || 'その他、自由にご記入ください'

              return (
              <div key={p.id} className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-900">{p.candidate_name}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3 border-b border-red-100 pb-2">フェーズ: {p.selection_step}</p>
                
                <div className="space-y-4">
                  {p.sentiment_score !== null && (
                    <div>
                      <p className="text-xs font-bold text-gray-700 mb-1">Q. {q1Text}</p>
                      <p className="text-sm text-gray-900 flex items-center gap-1 font-bold">
                        <span className="text-xl">
                          {p.sentiment_score <= 2 ? '😟' : p.sentiment_score === 3 ? '😐' : '😊'}
                        </span>
                        A. {p.sentiment_score}
                      </p>
                    </div>
                  )}

                  {p.concerns.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-700 mb-1">Q. {q2Text}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.concerns.map((c) => (
                          <span key={c} className="bg-white border border-red-200 text-xs text-gray-700 px-2 py-0.5 rounded-full">A. {c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {p.comment && (
                    <div>
                      <p className="text-xs font-bold text-gray-700 mb-1">Q. {q3Text}</p>
                      <p className="text-sm text-gray-800 bg-white p-2 rounded border border-red-100">A. {p.comment}</p>
                    </div>
                  )}
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
            <tr>
              <th className="px-6 py-3 font-medium">候補者名</th>
              <th className="px-6 py-3 font-medium">フェーズ</th>
              <th className="px-6 py-3 font-medium">ステータス</th>
              <th className="px-6 py-3 font-medium text-center">スコア</th>
              <th className="px-6 py-3 font-medium">発行日時</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-800">
            {pulses.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{p.candidate_name}</td>
                <td className="px-6 py-4">{p.selection_step}</td>
                <td className="px-6 py-4">
                  {p.is_answered ? (
                    <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded text-xs">回答済</span>
                  ) : (
                    <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs">未回答</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center text-lg font-bold">
                  {p.sentiment_score || '-'}
                </td>
                <td className="px-6 py-4 text-gray-500 text-xs">
                  {new Date(p.created_at).toLocaleString('ja-JP')}
                </td>
              </tr>
            ))}
            {pulses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  アンケートのデータがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">アンケート新規発行</h2>
            
            {issueUrl ? (
              <div>
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-md mb-4">
                  <p className="font-bold mb-2">発行完了しました</p>
                  <p className="text-sm">以下のURLをコピーして候補者に送付してください。</p>
                  <input 
                    type="text" 
                    readOnly 
                    value={issueUrl} 
                    className="w-full mt-2 p-2 border rounded text-xs bg-white focus:outline-none" 
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false)
                    setIssueUrl('')
                    setCandidateName('')
                    setCandidateEmail('')
                    setSelectionStep('')
                  }}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 rounded transition"
                >
                  閉じる
                </button>
              </div>
            ) : (
              <form onSubmit={handleIssue} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">候補者名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full border p-2 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: 山田 太郎"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">選考フェーズ</label>
                  <input
                    type="text"
                    value={selectionStep}
                    onChange={(e) => setSelectionStep(e.target.value)}
                    className="w-full border p-2 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: 一次面接後、内定通知前"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス（自動送信する場合）</label>
                  <input
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    className="w-full border p-2 rounded focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: taro@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">入力すると候補者にアンケート依頼メールが送信されます。</p>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded font-medium transition"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !candidateName}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded font-medium shadow-sm transition"
                  >
                    {isSubmitting ? '発行中...' : '発行する'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-md shadow-lg flex items-center gap-3 z-50 animate-fade-in-up">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          {toastMessage}
        </div>
      )}
    </div>
  )
}
