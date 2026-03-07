'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { analyzeCompanyUrl, saveCompanyProfile } from '../actions'

interface CompanyData {
  companyName: string
  businessDescription: string
  missionVision: string
  cultureAndBenefits: string
}

export function QuickStartUI() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo')

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [url, setUrl] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isSaving, startSaveTransition] = useTransition()
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)

  const handleAnalyze = () => {
    if (!url) {
      alert('URLを入力してください')
      return
    }
    setStep(2)
    startTransition(async () => {
      try {
        const result = await analyzeCompanyUrl(url)
        if (result.success && result.data) {
          setCompanyData(result.data)
          setStep(3)
        } else {
          alert('解析に失敗しました: ' + (result.error || '不明なエラー'))
          setStep(1)
        }
      } catch (error) {
        console.error(error)
        alert('エラーが発生しました')
        setStep(1)
      }
    })
  }

  const handleFinish = () => {
    if (!companyData) return

    startSaveTransition(async () => {
      try {
        const result = await saveCompanyProfile(companyData)
        if (result?.success) {
          if (returnTo) {
            router.push(returnTo)
          } else {
            router.push('/top')
          }
        }
      } catch (error) {
        console.error(error)
        alert('保存中にエラーが発生しました: ' + (error instanceof Error ? error.message : String(error)))
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto w-full">
      {step === 1 && (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center space-y-8 animate-in fade-in zoom-in duration-300">
          <div className="text-5xl drop-shadow-sm">🚀</div>
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 border-b pb-4 mb-4">QuickStart AI</h2>
            <p className="text-lg text-gray-500 font-medium">企業URLを入力するだけで、AIが自社の基本情報を全自動でセットアップします。</p>
          </div>
          <div className="space-y-4 text-left">
            <label className="block text-sm font-semibold text-gray-700">
              自社のWebサイト（企業サイト・採用ページなど）のURLを入力してください
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-5 py-4 text-lg rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-sm"
              disabled={isPending}
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={!url || isPending}
            className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-lg rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition disabled:opacity-50 disabled:transform-none"
          >
            ✨ AIでセットアップ
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white p-16 rounded-2xl shadow-xl border border-gray-100 text-center space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-center mb-6">
             <svg className="animate-spin h-12 w-12 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 animate-pulse">✨ あなたの会社を分析中...</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">指定されたWebサイトから、会社名やミッション、社風などを読み取っています。しばらくお待ちください。</p>
        </div>
      )}

      {step === 3 && companyData && (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">分析が完了しました！</h2>
            <p className="text-sm text-gray-500 mt-2">AIが読み取った情報を確認・編集してください。</p>
          </div>
          
          <div className="space-y-5 bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">会社名</label>
              <input
                type="text"
                value={companyData.companyName}
                onChange={(e) => setCompanyData({...companyData, companyName: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium text-gray-900 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">事業内容 (要約)</label>
              <textarea
                value={companyData.businessDescription}
                onChange={(e) => setCompanyData({...companyData, businessDescription: e.target.value})}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-28 bg-white text-gray-800 shadow-sm leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">ミッション・ビジョン</label>
              <textarea
                value={companyData.missionVision}
                onChange={(e) => setCompanyData({...companyData, missionVision: e.target.value})}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 bg-white text-gray-800 shadow-sm leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">社風・福利厚生など</label>
              <textarea
                value={companyData.cultureAndBenefits}
                onChange={(e) => setCompanyData({...companyData, cultureAndBenefits: e.target.value})}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 bg-white text-gray-800 shadow-sm leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
             <button 
                onClick={() => setStep(1)}
                className="flex-1 px-4 py-3 text-gray-600 font-semibold border border-gray-300 rounded-xl hover:bg-gray-50 transition shadow-sm"
              >
                やり直す
             </button>
             <button 
                onClick={handleFinish}
                disabled={isSaving}
                className="flex-[2] px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 transition disabled:opacity-50"
              >
                {isSaving ? '保存中...' : 'この内容で始める'}
             </button>
          </div>
        </div>
      )}
    </div>
  )
}
