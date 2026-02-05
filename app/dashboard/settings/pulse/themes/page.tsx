// app/dashboard/settings/pulse/themes/page.tsx
"use client"

import { useEffect, useState } from 'react'
import { getAvailableThemes } from './actions'
import type { PulseTheme } from './actions'
import { ThemeSelector } from '@/components/pulse/ThemeSelector'
import { ThemeGuideModal } from '@/components/pulse/ThemeGuideModal'
import { Lightbulb, TrendingUp, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PulseThemesPage() {
  const [themes, setThemes] = useState<PulseTheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    async function loadThemes() {
      try {
        const data = await getAvailableThemes();
        setThemes(data);
      } catch (error) {
        console.error('Failed to load themes:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadThemes();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* ページヘッダー */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
              <Lightbulb className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">パルス診断テーマ選択</h1>
              <p className="text-gray-600 mt-1">
                社員に聞くべきテーマを選択して、組織の健康状態を可視化しましょう
              </p>
            </div>
          </div>
          
          {/* 仕組み説明ボタン */}
          <Button
            onClick={() => setIsGuideOpen(true)}
            variant="outline"
            className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
          >
            <HelpCircle className="h-4 w-4" />
            仕組みを見る
          </Button>
        </div>

        {/* インテリジェント・ガイド */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mt-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-blue-900 mb-2">インテリジェントな選択をサポート</h3>
              <p className="text-sm text-blue-900/70 leading-relaxed">
                <strong className="text-amber-600">「おすすめ」バッジ</strong>がついているテーマは、
                最近アラートが急増している、または平均スコアが低いなど、
                <strong>今すぐ確認すべき兆候</strong>があります。
                組織の状況に合わせて、適切なテーマを選択してください。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* テーマ選択UI */}
      <ThemeSelector themes={themes} />

      {/* 仕組み説明モーダル */}
      <ThemeGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  )
}
