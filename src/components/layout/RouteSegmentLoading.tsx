import React from 'react'
import Image from 'next/image'

/** ルートセグメント・Suspense 共通の読み込み表示（ポータル / 管理 / SaaS サブメニュー等） */
export function RouteSegmentLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-slate-500 px-4">
      {/* public/icon.png（ブランドアイコン。差し替え時もファイル名は維持） */}
      <Image
        src="/icon.png"
        alt=""
        width={88}
        height={88}
        priority
        className="mb-4 rounded-[22px] shadow-lg animate-pulse object-cover select-none"
      />
      <p className="animate-pulse text-sm font-medium">データを読み込んでいます…</p>
      <p className="text-xs text-slate-400 mt-2">しばらくお待ちください</p>
    </div>
  )
}
