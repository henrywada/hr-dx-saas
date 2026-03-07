"use client";

import React from "react";
import { Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui";

interface PaywallOverlayProps {
  children: React.ReactNode;
  /** true の場合、オーバーレイを表示してコンテンツをブロック */
  isLocked: boolean;
  /** アップグレードボタンの遷移先 (将来的に課金ページへ) */
  upgradeHref?: string;
  /** ロック時に表示するメッセージ */
  message?: string;
}

/**
 * 課金制御オーバーレイコンポーネント
 *
 * `isLocked === true` の場合、子コンテンツの上に半透明のレイヤーと
 * 「Proプランへアップグレード」ボタンを重ねて表示します。
 *
 * @example
 * ```tsx
 * <PaywallOverlay isLocked={planType === 'free'}>
 *   <ScoutTextResult text={scoutText} />
 * </PaywallOverlay>
 * ```
 */
export function PaywallOverlay({
  children,
  isLocked,
  upgradeHref = "/settings",
  message = "この機能はProプラン以上でご利用いただけます",
}: PaywallOverlayProps) {
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative select-none">
      {/* コンテンツ（ぼかし & 透過） */}
      <div
        className="pointer-events-none"
        style={{ filter: "blur(6px)", opacity: 0.4 }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* オーバーレイ */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 rounded-xl bg-gradient-to-b from-white/70 via-white/60 to-white/80 backdrop-blur-sm">
        {/* ロックアイコン */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center mb-4 shadow-md border border-purple-200/50">
          <Lock className="w-6 h-6 text-purple-600" />
        </div>

        {/* メッセージ */}
        <p className="text-sm font-semibold text-slate-700 mb-1 text-center px-4">
          {message}
        </p>
        <p className="text-xs text-slate-500 mb-5 text-center px-4">
          AI スカウト文・面接ガイドなど高度な機能をアンロック
        </p>

        {/* アップグレードボタン */}
        <a href={upgradeHref}>
          <Button
            variant="primary"
            size="sm"
            className="!bg-gradient-to-r !from-purple-600 !to-indigo-600 hover:!from-purple-700 hover:!to-indigo-700 shadow-lg shadow-purple-200/50 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Pro プランへアップグレード
          </Button>
        </a>
      </div>
    </div>
  );
}
