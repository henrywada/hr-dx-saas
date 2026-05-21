'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
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
    <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200/80 shadow-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* 立体的なメールアイコン */}
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-tr from-blue-50 to-indigo-50 shadow-inner ring-1 ring-blue-100/60 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-b from-white/60 to-transparent"></div>
          <Mail className="relative h-6 w-6 text-blue-600 stroke-[1.5]" aria-hidden />
        </div>
        
        <div className="space-y-1.5">
          <h1
            className="text-2xl font-bold tracking-tight text-slate-950 leading-none"
            style={{
              fontFamily: "'Yu Mincho', 'Noto Serif JP', serif",
              letterSpacing: '-0.01em',
            }}
          >
            パスワードの再設定
          </h1>
          <p className="text-xs text-slate-500 font-medium">登録されているメールアドレスを入力してください</p>
        </div>
      </div>

      {status === 'success' ? (
        <div className="space-y-6">
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 p-4 rounded-xl text-sm font-medium animate-fade-in flex items-start gap-2.5">
            <span className="shrink-0 text-emerald-500 text-lg leading-none">✓</span>
            <span className="leading-relaxed">{message}</span>
          </div>
          
          <Link 
            href="/login" 
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all cursor-pointer min-h-[46px]"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>ログイン画面に戻る</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-slate-500 text-center leading-relaxed">
            パスワード再設定用のリンクをメールでお送りします。受信トレイをご確認ください。
          </p>
          
          {status === 'error' && (
            <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3.5 rounded-xl text-sm font-medium animate-fade-in flex items-start gap-2">
              <span className="shrink-0 text-rose-500">⚠️</span>
              <span>{message}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-bold text-slate-700 tracking-wider uppercase">
                メールアドレス
              </label>
              <input 
                id="email"
                type="email" 
                placeholder="name@company.com"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                disabled={status === 'loading'}
                className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400 text-sm" 
              />
            </div>

            <button 
              type="submit" 
              disabled={status === 'loading'}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[46px]"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                  <span>送信中...</span>
                </>
              ) : (
                <span>再設定メールを送信</span>
              )}
            </button>
          </form>
          
          <div className="text-center pt-2">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ログインに戻る</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
