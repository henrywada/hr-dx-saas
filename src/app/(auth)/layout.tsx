import React from 'react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-b from-slate-50 to-slate-100/95 relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
      {/* プレミアムな大人の空間を演出する、極めて淡い微光のアンビエントライティング */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" aria-hidden />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" aria-hidden />

      {/* コンテンツコンテナ。ここでのみ最大幅を指定し、子要素は余計なラッパーを作らずカードデザインに集中できる */}
      <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {children}
      </div>
    </div>
  )
}
