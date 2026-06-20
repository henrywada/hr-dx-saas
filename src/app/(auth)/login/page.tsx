'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, Mail, Lock, Zap, ArrowRight } from 'lucide-react'
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
    <div className="space-y-8">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ログイン</h1>
        <p className="mt-2 text-sm text-slate-500">
          システムをご利用いただくにはアカウント情報が必要です。
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3.5 rounded-xl text-sm font-medium animate-fade-in flex items-start gap-2">
          <span className="shrink-0 text-rose-500">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" aria-busy={loading}>
        {/* メールアドレス */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            メールアドレス
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-slate-400" aria-hidden />
            </span>
            <input
              id="email"
              type="email"
              placeholder="example@hr-dx.jp"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
              className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg bg-slate-50/80 hover:bg-white text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400 text-sm"
            />
          </div>
        </div>

        {/* パスワード */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              パスワード
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-amber-600 hover:text-amber-500 transition-colors"
            >
              パスワードをお忘れですか？
            </Link>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-slate-400" aria-hidden />
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
              className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-lg bg-slate-50/80 hover:bg-white text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400 text-sm"
            />
            <button
              type="button"
              disabled={loading}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none disabled:opacity-50 cursor-pointer"
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


        {/* ログインボタン */}
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:ring-offset-2 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px]"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
              <span>ログイン中…</span>
            </>
          ) : (
            <>
              <span>ログイン</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </>
          )}
        </button>
      </form>

      {/* セキュリティ注意事項 */}
      <div className="border-l-4 border-amber-500 bg-amber-50/60 rounded-r-lg px-4 py-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Zap className="h-3.5 w-3.5 text-amber-600" aria-hidden />
          <span className="text-xs font-bold text-amber-700 tracking-wide">ご利用にあたって</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          共有端末でのご利用後は必ずログアウトしてください。パスワードを忘れた場合は「パスワードをお忘れですか？」から再設定できます。
        </p>
      </div>

    </div>
  )
}
