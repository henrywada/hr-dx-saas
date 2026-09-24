import React from 'react'
import ShaderWaveCanvas from '@/components/ui/ShaderWaveCanvas'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      {/* 左パネル — ブランドビジュアル */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative overflow-hidden">
        {/* WebGL シェーダー波アニメーション */}
        <ShaderWaveCanvas />
      </div>

      {/* 右パネル — フォームエリア */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12 sm:px-10 lg:px-16 xl:px-20">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </div>
    </div>
  )
}
