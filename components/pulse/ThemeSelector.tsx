// components/pulse/ThemeSelector.tsx
"use client"

import React, { useState } from 'react'
import { ThemeCard } from './ThemeCard'
import { Button } from "@/components/ui/button"
import { updateActiveThemes } from '@/app/dashboard/settings/pulse/themes/actions'
import type { PulseTheme } from '@/app/dashboard/settings/pulse/themes/actions'
import { CheckCircle2, Sparkles } from 'lucide-react'

interface ThemeSelectorProps {
  themes: PulseTheme[];
}

export function ThemeSelector({ themes }: ThemeSelectorProps) {
  const [selectedThemes, setSelectedThemes] = useState<string[]>(
    themes.filter(t => t.isActive).map(t => t.id)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleToggle = (themeId: string) => {
    setSelectedThemes(prev => 
      prev.includes(themeId) 
        ? prev.filter(id => id !== themeId)
        : [...prev, themeId]
    );
  };

  const handleSelectRecommended = () => {
    const recommendedIds = themes
      .filter(t => t.isRecommended)
      .map(t => t.id);
    setSelectedThemes(recommendedIds);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const result = await updateActiveThemes(selectedThemes);
      setSaveMessage(result.message);
      
      // 3秒後にメッセージを消す
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error("Failed to save themes:", err);
      setSaveMessage("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const recommendedCount = themes.filter(t => t.isRecommended).length;

  return (
    <div className="space-y-6">
      {/* ヘッダー統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-5">
          <p className="text-sm text-indigo-600 font-medium mb-1">利用可能なテーマ</p>
          <p className="text-3xl font-black text-indigo-900">{themes.length}</p>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <p className="text-sm text-amber-600 font-medium">おすすめ</p>
          </div>
          <p className="text-3xl font-black text-amber-900">{recommendedCount}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-5">
          <p className="text-sm text-emerald-600 font-medium mb-1">選択中</p>
          <p className="text-3xl font-black text-emerald-900">{selectedThemes.length}</p>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSelectRecommended}
            disabled={recommendedCount === 0}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            おすすめを全選択
          </Button>
          
          <span className="text-xs text-gray-500">
            {selectedThemes.length > 0 
              ? `${selectedThemes.length}個のテーマを選択中` 
              : "テーマを選択してください"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {saveMessage && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium animate-in fade-in duration-300">
              <CheckCircle2 className="h-4 w-4" />
              {saveMessage}
            </div>
          )}
          
          <Button 
            onClick={handleSave}
            disabled={isSaving || selectedThemes.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                保存中...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                選択を保存
              </>
            )}
          </Button>
        </div>
      </div>

      {/* テーマカードグリッド */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {themes.map(theme => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isSelected={selectedThemes.includes(theme.id)}
            onToggle={handleToggle}
          />
        ))}
      </div>

      {themes.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium mb-2">利用可能なテーマがありません</p>
          <p className="text-sm">テーマを作成してください。</p>
        </div>
      )}
    </div>
  )
}
