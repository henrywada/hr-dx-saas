'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { APP_ROUTES } from '@/config/routes';
import { getSupabasePublicConfig } from '@/lib/supabase/public-config';
import { Eye, EyeOff, Loader2, KeyRound, ArrowLeft } from 'lucide-react';
import { verifyToken, resetPassword } from './actions';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState<string | null>(null);
  const [linkExpired, setLinkExpired] = useState(false);
  const [customUserId, setCustomUserId] = useState<string | null>(null);
  const [isCustomToken, setIsCustomToken] = useState(false);

  const supabaseRef = useRef(
    (() => {
      const { url, anonKey } = getSupabasePublicConfig();
      return createClient(url, anonKey);
    })()
  );

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (token && email) {
      setIsCustomToken(true);
      setRecoveryEmail(email);
      verifyToken(email, token).then((result) => {
        if (result.valid && result.userId) {
          setCustomUserId(result.userId);
          setReady(true);
        } else {
          if (result.error?.includes('有効期限')) {
            setLinkExpired(true);
          } else {
            setError(result.error || 'トークンの検証に失敗しました');
          }
        }
      });
      return;
    }

    const supabase = supabaseRef.current;

    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('error=')) {
        const params = new URLSearchParams(hash.substring(1));
        const errorCode = params.get('error_code');
        const errorDesc = params.get('error_description');
        if (errorCode === 'otp_expired' || errorDesc?.includes('expired')) {
          setLinkExpired(true);
          return;
        }
        setError(errorDesc || '認証エラーが発生しました。');
        return;
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
        setRecoveryEmail(session?.user?.email || null);
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください。');
      return;
    }
    if (password !== confirmPassword) {
      setError('パスワードが一致しません。');
      return;
    }

    setLoading(true);

    try {
      if (isCustomToken && customUserId) {
        const result = await resetPassword(customUserId, password);
        if (!result.success) {
          setError(result.error || 'パスワード更新に失敗しました');
          return;
        }
      } else {
        const supabase = supabaseRef.current;
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          setError(updateError.message);
          return;
        }
        await supabase.auth.signOut();
      }

      alert('パスワードの設定が完了しました。\nログイン画面からログインしてください。');
      window.location.href = APP_ROUTES.AUTH.LOGIN;
    } catch (err) {
      console.error('パスワード設定エラー:', err);
      setError('予期せぬエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200/80 shadow-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center text-center space-y-4">
        {/* 立体的なカギアイコン */}
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-tr from-blue-50 to-indigo-50 shadow-inner ring-1 ring-blue-100/60 overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-b from-white/60 to-transparent"></div>
          <KeyRound className="relative h-6 w-6 text-blue-600 stroke-[1.5]" aria-hidden />
        </div>
        
        <div className="space-y-1.5">
          <h1
            className="text-2xl font-bold tracking-tight text-slate-950 leading-none"
            style={{
              fontFamily: "'Yu Mincho', 'Noto Serif JP', serif",
              letterSpacing: '-0.01em',
            }}
          >
            パスワード設定
          </h1>
          <p className="text-xs text-slate-500 font-medium">新しいログインパスワードを設定してください</p>
        </div>
      </div>

      {linkExpired ? (
        <div className="text-center py-4 space-y-5">
          <div className="mx-auto flex items-center justify-center w-14 h-14 bg-amber-50 text-amber-600 rounded-full ring-1 ring-amber-100/80">
            <span className="text-xl">⌛</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-900">
              リンクの有効期限が切れています
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              このパスワード設定リンクは無効です。<br />
              管理者に連絡して、メールを再送信してもらってください。
            </p>
          </div>
          <a
            href={APP_ROUTES.AUTH.LOGIN}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors min-h-[46px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ログイン画面へ</span>
          </a>
        </div>
      ) : !ready ? (
        error ? (
          <div className="text-center py-4 space-y-5">
            <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3.5 rounded-xl text-sm font-medium">{error}</div>
            <a
              href={APP_ROUTES.AUTH.LOGIN}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors min-h-[46px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ログイン画面へ</span>
            </a>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-xs text-slate-500 font-medium font-mono">認証情報を確認しています...</p>
          </div>
        )
      ) : (
        <>
          {recoveryEmail && (
            <div className="bg-blue-50 text-blue-700 border border-blue-100/50 p-3 rounded-xl text-xs font-semibold text-center">
              <span className="font-bold">{recoveryEmail}</span> のパスワードを設定します
            </div>
          )}

          {error && (
            <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3.5 rounded-xl text-sm font-medium animate-fade-in flex items-start gap-2">
              <span className="shrink-0 text-rose-500">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase">新しいパスワード</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="6文字以上"
                  className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs pr-10 disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400 text-sm"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 shrink-0 transition-colors" /> : <Eye className="h-4 w-4 shrink-0 transition-colors" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 tracking-wider uppercase">新しいパスワード確認</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="もう一度入力してください"
                  className="block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs pr-10 disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400 text-sm"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4 shrink-0 transition-colors" /> : <Eye className="h-4 w-4 shrink-0 transition-colors" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[46px] mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                  <span>設定中...</span>
                </>
              ) : (
                <span>パスワードを設定する</span>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-md space-y-8 animate-in fade-in duration-500">
        <div className="text-center py-8 space-y-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-xs text-slate-500 font-medium font-mono">読み込み中...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
