"use client";

import React from "react";
import { Sparkles, MessageSquareText, ClipboardList, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui";
import type { AiGenerationResult } from "../types";
import type { PlanType } from "@/types/auth";

interface AiOutputDisplayProps {
  /** AI生成結果データ */
  result: AiGenerationResult;
  /** 現在のテナントプラン */
  planType?: PlanType;
}

/**
 * AI 出力表示コンポーネント（雛形）
 *
 * - キャッチコピー: 全プランでそのまま表示
 * - スカウト文: free プランでは PaywallOverlay でラップ
 * - 面接ガイド: free プランでは PaywallOverlay でラップ
 *
 * @example
 * ```tsx
 * <AiOutputDisplay
 *   result={{ catchphrase: "...", scoutText: "...", interviewGuide: "..." }}
 *   planType={user.planType}
 * />
 * ```
 */
export function AiOutputDisplay({ result }: AiOutputDisplayProps) {
  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────
         1. キャッチコピー（全プラン利用可）
         ───────────────────────────────────── */}
      <Card variant="accent-orange" className="relative overflow-hidden">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
              AI キャッチコピー
            </h4>
            <p className="text-lg font-bold text-slate-800 leading-relaxed">
              {result.catchphrase || "—"}
            </p>
          </div>
        </div>
      </Card>

      {/* ─────────────────────────────────────
         2. スカウト文（全プラン開放）
         ───────────────────────────────────── */}
      <Card variant="primary" className="relative overflow-hidden min-h-[220px]">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shrink-0">
              <MessageSquareText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                AI スカウト文
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {result.scoutText || "AI がスカウト文を生成します..."}
              </p>
            </div>
          </div>
        </Card>

      {/* ─────────────────────────────────────
         3. 面接ガイド（全プラン開放）
         ───────────────────────────────────── */}
      <Card variant="accent-teal" className="relative overflow-hidden min-h-[220px]">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                AI 面接ガイド
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {result.interviewGuide || "AI が面接ガイドを生成します..."}
              </p>
            </div>
          </div>
        </Card>

      {/* ─────────────────────────────────────
         4. メディア・アドバイス（全プラン開放）
         ───────────────────────────────────── */}
      <Card variant="accent-orange" className="relative overflow-hidden min-h-[150px]">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                💡 AIからの掲載メディア・アドバイス
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {result.mediaAdvice || "AI が掲載メディアのアドバイスを提案します..."}
              </p>
            </div>
          </div>
        </Card>
    </div>
  );
}
