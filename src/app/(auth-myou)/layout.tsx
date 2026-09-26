import React from 'react'
import Image from 'next/image'

/** MYOU 専用ログインレイアウト：左パネル中央にブランド画像を配置 */
export default function MyouAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] items-center justify-center bg-[#fdfdfd]">
        <Image
          src="/myou/login.webp"
          alt="セルフィールMS 防カビメンテナンススプレー"
          width={400}
          height={800}
          priority
          className="h-auto max-h-[80vh] w-auto max-w-full object-contain"
        />
      </div>
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12 sm:px-10 lg:px-16 xl:px-20">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </div>
    </div>
  )
}
