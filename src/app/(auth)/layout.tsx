import React from 'react'
import { Settings } from 'lucide-react'
import ShaderWaveCanvas from '@/components/ui/ShaderWaveCanvas'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      {/* 左パネル — ブランドビジュアル */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] relative flex-col justify-between p-10 xl:p-14 overflow-hidden">

        {/* メインコピー */}
        <div className="relative z-10 mt-8 xl:mt-16">
          <h1 className="text-3xl xl:text-4xl 2xl:text-[2.75rem] font-bold text-white leading-tight tracking-tight">
            HR-DX
          </h1>
          <p className="mt-5 text-sm xl:text-base text-slate-300/90 leading-relaxed max-w-sm">
            健康経営の推進から人材活用・業務改善まで、AIが人事データを分析し最適な施策を提案。勤怠・採用・ストレスチェック・組織診断をワンストップで支援します。
          </p>
        </div>

        {/* WebGL シェーダー波アニメーション */}
        <ShaderWaveCanvas />

        {/* フッター: エンタープライズバッジ */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-700/60 ring-1 ring-slate-600/40">
            <Settings className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">エンタープライズ級のセキュリティ水準</p>
            <p className="text-xs text-slate-400">Enterprise Security</p>
          </div>
        </div>
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
