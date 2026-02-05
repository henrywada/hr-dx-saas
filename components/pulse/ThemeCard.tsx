// components/pulse/ThemeCard.tsx
"use client"

import React from 'react'
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { TrendingUp, AlertCircle, Calendar, Star } from "lucide-react"
import type { PulseTheme } from '@/app/dashboard/settings/pulse/themes/actions'

interface ThemeCardProps {
  theme: PulseTheme;
  isSelected: boolean;
  onToggle: (themeId: string) => void;
  onPreview?: (themeId: string) => void;
}

export function ThemeCard({ theme, isSelected, onToggle, onPreview }: ThemeCardProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "未実施";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "今日";
    if (diffDays === 1) return "昨日";
    if (diffDays < 7) return `${diffDays}日前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
    return `${Math.floor(diffDays / 30)}ヶ月前`;
  };

  const getScoreColor = (score: number | null, threshold: number) => {
    if (score === null) return "text-gray-400";
    if (score < threshold) return "text-rose-600 font-bold";
    if (score < threshold + 0.5) return "text-orange-500";
    return "text-emerald-600";
  };

  return (
    <div 
      className={`
        group relative rounded-xl border-2 bg-white p-6 transition-all duration-300
        hover:shadow-xl hover:-translate-y-1
        ${isSelected ? 'border-indigo-500 bg-indigo-50/50 shadow-lg' : 'border-gray-200 hover:border-indigo-300'}
        ${theme.isRecommended ? 'ring-2 ring-amber-400/50' : ''}
      `}
    >
      {/* おすすめバッジ */}
      {theme.isRecommended && (
        <div className="absolute -top-3 -right-3 z-10 animate-bounce">
          <div className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1.5 rounded-full shadow-lg text-xs font-bold">
            <Star className="h-3 w-3 fill-white" />
            おすすめ
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-xl text-gray-800">{theme.label}</h3>
            {theme.stats.alertCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                {theme.stats.alertCount}件
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{theme.description}</p>
        </div>
        
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={() => onToggle(theme.id)}
          className="h-5 w-5 mt-1"
        />
      </div>

      {/* 統計バッジ */}
      <div className="flex flex-wrap gap-2 mb-4">
        {theme.stats.averageScore !== null && (
          <Badge variant="outline" className="bg-white">
            <span className="text-gray-500 mr-1">平均</span>
            <span className={getScoreColor(theme.stats.averageScore, theme.alarm_threshold)}>
              {theme.stats.averageScore.toFixed(1)}
            </span>
          </Badge>
        )}
        
        <Badge variant="outline" className="bg-white">
          <Calendar className="h-3 w-3 mr-1 text-gray-400" />
          <span className="text-gray-600">{formatDate(theme.stats.lastExecuted)}</span>
        </Badge>

        {theme.stats.recentAlertTrend === "increasing" && (
          <Badge variant="destructive" className="gap-1">
            <TrendingUp className="h-3 w-3" />
            急増中
          </Badge>
        )}
      </div>

      {/* 訴求文（usage_tips） */}
      <div className="mb-4">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-lg p-4">
          <p className="text-xs font-medium text-indigo-900/60 mb-1">💡 こんな組織におすすめ</p>
          <p className="text-sm text-indigo-900 leading-relaxed font-medium">
            {theme.usage_tips || "組織の健康状態を把握したい管理者の方に最適です。"}
          </p>
        </div>
      </div>

      {/* ホバー時に表示される詳細情報 */}
      <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 max-h-0 group-hover:max-h-40 overflow-hidden">
        <div className="border-t border-gray-200 pt-4 space-y-3">
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">📊 測定目的</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {theme.objective || "組織の健康状態を定量的に測定します。"}
            </p>
          </div>
        </div>
      </div>

      {/* 詳細ボタン（オプション） */}
      {onPreview && (
        <button 
          onClick={() => onPreview(theme.id)}
          className="mt-4 w-full text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors opacity-0 group-hover:opacity-100"
        >
          さらに詳しく見る →
        </button>
      )}
    </div>
  )
}
