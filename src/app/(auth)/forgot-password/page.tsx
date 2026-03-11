'use client';

import { useState } from 'react';
import Link from 'next/link';
import { resetPasswordAction } from '@/lib/auth/actions';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const result = await resetPasswordAction(email);
      if (result.success) {
        setStatus('success');
        setMessage('パスワード再設定用のメールを送信しました。メール内のリンクからパスワードを再設定してください。');
      } else {
        setStatus('error');
        setMessage(result.error || 'メールの送信に失敗しました。');
      }
    } catch {
      setStatus('error');
      setMessage('通信エラーが発生しました。');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">パスワードの再設定</h2>
        
        {status === 'success' ? (
          <div className="space-y-6">
            <div className="bg-green-50 text-green-700 p-4 rounded text-sm mb-4">
              {message}
            </div>
            <div className="text-center mt-4">
              <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                ログイン画面に戻る
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 text-center">
              登録されているメールアドレスを入力してください。パスワード再設定用のリンクをメールでお送りします。
            </p>
            
            {status === 'error' && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">
                {message}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" 
                  disabled={status === 'loading'}
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? '送信中...' : 'メールを送信'}
              </button>
            </form>
            
            <div className="text-center mt-4">
              <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                ログイン画面に戻る
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
