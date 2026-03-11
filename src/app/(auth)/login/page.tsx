'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
// インポート元を actions に変更
import { signInAction } from '@/lib/auth/actions';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // signInAction を呼び出す
      const result = await signInAction(email, password);
      if (result && !result.success) {
        setError(result.error || 'ログインに失敗しました');
      }
    } catch (err: unknown) {
      // redirect() による例外は無視する
      if (err instanceof Error && err.message !== 'NEXT_REDIRECT') {
        setError('通信エラーが発生しました');
      } else if (typeof err === 'object' && err !== null && 'message' in err && (err as any).message !== 'NEXT_REDIRECT') {
        setError('通信エラーが発生しました');
      }
    }
  };

  return (
    // ... (UI部分は変更なし)
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">ログイン</h2>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">パスワード</label>
              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                  パスワードを忘れたとき
                </Link>
              </div>
            </div>
            <div className="relative mt-1">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm pr-10" 
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
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
          </div>
          <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700">ログイン</button>
        </form>
      </div>
    </div>
  );
}