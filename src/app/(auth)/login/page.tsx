'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react'
import { signInAction } from '@/lib/auth/actions'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signInAction(email, password)
      if (result && !result.success) {
        setError(result.error || 'ログインに失敗しました')
        setLoading(false)
        return
      }
      if (result?.success) {
        setLoading(false)
      }
    } catch (err: unknown) {
      const isRedirect =
        (err instanceof Error && err.message === 'NEXT_REDIRECT') ||
        (typeof err === 'object' &&
          err !== null &&
          'message' in err &&
          (err as { message?: string }).message === 'NEXT_REDIRECT')
      if (!isRedirect) {
        setError('通信エラーが発生しました')
        setLoading(false)
      }
    }
  }

  return (
    <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200/80 shadow-md space-y-8">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* 精緻で立体的なロックアイコン */}
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-tr from-blue-50 to-indigo-50 shadow-inner ring-1 ring-blue-100/60 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-b from-white/60 to-transparent"></div>
          <Lock className="relative h-6 w-6 text-blue-600 stroke-[1.5]" aria-hidden />
        </div>
        
        <div className="space-y-1.5">
          <h1
            className="text-3xl font-extrabold tracking-tight text-slate-950 leading-none"
            style={{
              fontFamily: "'Yu Mincho', 'Noto Serif JP', serif",
              letterSpacing: '-0.02em',
            }}
          >
            HR-DX <span className="text-blue-600">SaaS</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">ワークスペースにログインします</p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3.5 rounded-xl text-sm mb-4 font-medium animate-fade-in flex items-start gap-2">
          <span className="shrink-0 text-rose-500">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" aria-busy={loading}>
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-bold text-slate-700 tracking-wider uppercase">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
            className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-xs font-bold text-slate-700 tracking-wider uppercase">
              パスワード
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
            >
              パスワードをお忘れですか？
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
              className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs pr-10 disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400 text-sm"
            />
            <button
              type="button"
              disabled={loading}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none disabled:opacity-50 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 shrink-0 transition-colors" />
              ) : (
                <Eye className="h-4 w-4 shrink-0 transition-colors" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[46px] mt-6"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
              <span>ログイン中…</span>
            </>
          ) : (
            <span>ログインする</span>
          )}
        </button>
      </form>
    </div>
  )
}
