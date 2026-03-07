"use client";

import React, { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { generateJobContent, getMonthlyUsageCount } from "../actions";
import type { GenerateJobInput } from "../actions";
import type { AiGenerationResult } from "../types";
import type { PlanType } from "@/types/auth";
import { AiOutputDisplay } from "./AiOutputDisplay";

interface AiJobFormProps {
  /** テナントのプラン種別 */
  planType?: PlanType;
}

/**
 * AI 求人コンテンツ生成フォーム
 *
 * 3つの質問に回答 → OpenAI で「キャッチコピー」「スカウト文」「面接ガイド」を一括生成
 */
export function AiJobForm({ planType }: AiJobFormProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AiGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<GenerateJobInput>({
    challenge: "",
    expectations: "",
    uniquePoints: "",
  });

  const [usage, setUsage] = useState<{ count: number; max: number; isUnlimited: boolean } | null>(null);

  React.useEffect(() => {
    getMonthlyUsageCount().then(setUsage).catch(console.error);
  }, []);

  const updateField = (field: keyof GenerateJobInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    startTransition(async () => {
      const res = await generateJobContent(form);
      if (res.success && res.data) {
        setResult(res.data);
        // 生成成功後に利用回数を再取得
        const updatedUsage = await getMonthlyUsageCount();
        setUsage(updatedUsage);
      } else {
        setError(res.error || "生成に失敗しました。");
      }
    });
  };

  const isValid =
    form.challenge.trim().length > 0 &&
    form.expectations.trim().length > 0 &&
    form.uniquePoints.trim().length > 0;

  const isLimitReached = !usage?.isUnlimited && usage && usage.count >= usage.max;
  const remainingCount = usage ? Math.max(0, usage.max - usage.count) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      {/* ─── 左側: 入力フォーム ─── */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200/50">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                AI 求人コンテンツ生成
              </h2>
              <p className="text-xs text-slate-500">
                3つの質問に答えるだけで、AIが求人原稿を自動生成します
              </p>
            </div>
          </div>

          {/* Q1 */}
          <div>
            <label
              htmlFor="challenge"
              className="block text-sm font-semibold text-slate-700 mb-1.5"
            >
              Q1. 採用で解決したい課題は何ですか？
            </label>
            <p className="text-xs text-slate-500 mb-2">
              例: エンジニア不足でプロダクト開発が遅延している
            </p>
            <textarea
              id="challenge"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-colors resize-none"
              placeholder="現在の採用課題を具体的にお書きください..."
              value={form.challenge}
              onChange={(e) => updateField("challenge", e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Q2 */}
          <div>
            <label
              htmlFor="expectations"
              className="block text-sm font-semibold text-slate-700 mb-1.5"
            >
              Q2. 候補者にどんなことを期待しますか？
            </label>
            <p className="text-xs text-slate-500 mb-2">
              例: React/TypeScript での開発経験、チームリードの経験
            </p>
            <textarea
              id="expectations"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-colors resize-none"
              placeholder="求める経験・スキル・人物像をお書きください..."
              value={form.expectations}
              onChange={(e) => updateField("expectations", e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Q3 */}
          <div>
            <label
              htmlFor="uniquePoints"
              className="block text-sm font-semibold text-slate-700 mb-1.5"
            >
              Q3. 自社のユニークな点・魅力は何ですか？
            </label>
            <p className="text-xs text-slate-500 mb-2">
              例: フルリモート勤務OK、自社プロダクトで社会課題を解決
            </p>
            <textarea
              id="uniquePoints"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-colors resize-none"
              placeholder="候補者に伝えたい御社の魅力をお書きください..."
              value={form.uniquePoints}
              onChange={(e) => updateField("uniquePoints", e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 送信ボタン周辺 */}
          <div className="space-y-3 pt-2">
            {!usage?.isUnlimited && usage && (
              <div className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-lg border border-slate-200">
                <span className="text-sm font-medium text-slate-600">今月のAI無料チケット</span>
                <span className="text-sm font-bold flex items-center gap-2">
                  残り
                  <span className={`text-lg ${isLimitReached ? 'text-red-500' : 'text-purple-600'}`}>
                    {remainingCount}
                  </span>
                  / {usage.max} 回
                </span>
              </div>
            )}
            
            <Button
              type="submit"
              variant="primary"
              disabled={!isValid || isPending || isLimitReached}
              className="w-full !bg-gradient-to-r !from-purple-600 !to-indigo-600 hover:!from-purple-700 hover:!to-indigo-700 disabled:!from-slate-300 disabled:!to-slate-400 shadow-lg shadow-purple-200/50 flex items-center justify-center gap-2 !py-3"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AIが生成中...（20〜30秒ほどお待ちください）
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  AI で求人原稿を生成する
                </>
              )}
            </Button>
            {isLimitReached && (
              <p className="text-xs text-red-500 text-center font-medium mt-1">
                利用制限に達しました。Proプランへのアップグレードをご検討ください。
              </p>
            )}
          </div>
        </form>
      </Card>

      {/* ─── 右側: 結果表示 ─── */}
      <div className="h-[calc(100vh-180px)] min-h-[600px] sticky top-6">
        {result ? (
          <AiOutputDisplay result={result} planType={planType} />
        ) : (
          <div className="h-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <Sparkles className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-500">生成結果がここに表示されます</h3>
            <p className="text-sm max-w-xs mt-2">
              左側のフォームに入力して「AI で求人原稿を生成する」ボタンを押してください。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
