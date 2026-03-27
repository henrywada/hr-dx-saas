import React from 'react';
import { Loader2 } from 'lucide-react';

/** ルートセグメント・Suspense 共通の読み込み表示（ポータル / 管理 / SaaS サブメニュー等） */
export function RouteSegmentLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-slate-500">
      <Loader2 className="w-10 h-10 animate-spin mb-4 text-accent-orange" aria-hidden />
      <p className="animate-pulse text-sm font-medium">データを読み込んでいます…</p>
      <p className="text-xs text-slate-400 mt-2">しばらくお待ちください</p>
    </div>
  );
}
