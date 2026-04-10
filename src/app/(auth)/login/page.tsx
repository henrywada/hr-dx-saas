'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
// インポート元を actions に変更
import { signInAction } from '@/lib/auth/actions';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signInAction(email, password);
      if (result && !result.success) {
        setError(result.error || 'ログインに失敗しました');
        setLoading(false);
        return;
      }
      // セッションなしで success のみ返るケース（通常は redirect で遷移）
      if (result?.success) {
        setLoading(false);
      }
    } catch (err: unknown) {
      // redirect() は NEXT_REDIRECT を投げる — 遷移完了までローディング表示を維持
      const isRedirect =
        (err instanceof Error && err.message === 'NEXT_REDIRECT') ||
        (typeof err === 'object' &&
          err !== null &&
          'message' in err &&
          (err as { message?: string }).message === 'NEXT_REDIRECT');
      if (!isRedirect) {
        setError('通信エラーが発生しました');
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        {/* 1行目: ロゴ + HR-dx／2行目: ログイン */}
        <div className="flex w-full flex-col items-start gap-6 pb-2">
          <div className="flex items-center gap-2 w-full justify-center lg:justify-start" aria-label="HR-dx">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF6B00] to-orange-600 shadow-md">
              <span className="text-lg font-bold tracking-tight text-white">H</span>
            </div>
            <span className="select-none bg-gradient-to-br from-[#FF6B00] to-orange-600 bg-clip-text text-xl font-bold tracking-tighter text-transparent drop-shadow-sm">
              HR-dx
            </span>
          </div>
          
          <div className="w-full flex flex-col items-center justify-center pt-2 pb-4 space-y-3">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 shadow-inner ring-1 ring-blue-100/60 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent"></div>
              <Lock className="relative h-6 w-6 text-blue-600 stroke-[1.5]" aria-hidden />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-br from-slate-900 via-slate-800 to-slate-500 bg-clip-text text-transparent md:text-3xl">
                ログイン
              </h1>
            </div>
          </div>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6" aria-busy={loading}>
          <div>
            <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">パスワード</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm pr-10 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <button
                type="button"
                disabled={loading}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none disabled:opacity-50"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="mt-2 text-right text-sm">
              <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                パスワードを忘れたとき
              </Link>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-80 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[42px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                ログイン中…
              </>
            ) : (
              'ログイン'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}