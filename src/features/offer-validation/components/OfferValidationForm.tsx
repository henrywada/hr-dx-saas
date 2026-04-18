'use client'

import React, { useState, useTransition } from 'react'
import { validateOfferAction } from '../actions'
import { OfferValidationResponse } from '../schemas'
import { ValidationResultDisplay } from './ValidationResultDisplay'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Loader2, SearchIcon, AlertCircle } from 'lucide-react'

export const OfferValidationForm = () => {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OfferValidationResponse | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        const response = await validateOfferAction(null, formData)
        if (response.success && response.data) {
          setResult(response.data)
        } else {
          setError(response.error || '検証中にエラーが発生しました。')
        }
      } catch (err: any) {
        setError(err.message || '予期せぬエラーが発生しました。')
      }
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="shadow-sm border border-gray-100 p-0 overflow-hidden">
        <div className="bg-linear-to-r from-blue-50 to-indigo-50 border-b border-gray-100 p-6">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2 m-0">
            <SearchIcon className="h-6 w-6 text-indigo-600" />
            オファー条件を入力
          </h3>
          <p className="text-gray-600 mt-2">
            採用ターゲットの職種・必須要件、想定給与、勤務地を入力すると、最新の市場データをもとにAIがオファーの競争力を診断します。
          </p>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* 求める条件 */}
              <div>
                <label
                  htmlFor="jobConditions"
                  className="block text-sm font-semibold text-gray-700 mb-1"
                >
                  求める条件・ターゲット <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="jobConditions"
                  name="jobConditions"
                  rows={4}
                  required
                  placeholder="例：AIエンジニア、Python開発経験5年以上、マネジメント経験優遇"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm shadow-sm"
                  disabled={isPending}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 提示賃金 */}
                <div>
                  <label
                    htmlFor="salary"
                    className="block text-sm font-semibold text-gray-700 mb-1"
                  >
                    想定給与（提示賃金） <span className="text-red-500">*</span>
                  </label>
                  <div className="flex relative rounded-md shadow-sm">
                    <input
                      type="number"
                      id="salary"
                      name="salary"
                      required
                      min={0}
                      placeholder="例: 800"
                      className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md sm:text-sm border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={isPending}
                    />
                    <select
                      id="salaryUnit"
                      name="salaryUnit"
                      className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={isPending}
                    >
                      <option value="万円">万円（年収/月収）</option>
                      <option value="千円">千円</option>
                      <option value="円">円（時給等）</option>
                    </select>
                  </div>
                </div>

                {/* 勤務地域 */}
                <div>
                  <label
                    htmlFor="location"
                    className="block text-sm font-semibold text-gray-700 mb-1"
                  >
                    勤務地域 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    required
                    placeholder="例：東京都、フルリモート"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={isPending}
                className="flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    市場データを取得・検証中...
                  </>
                ) : (
                  <>
                    <SearchIcon className="h-5 w-5" />
                    オファー妥当性を検証する
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* 結果表示領域 */}
      {result && <ValidationResultDisplay result={result} />}
    </div>
  )
}
