'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { APP_ROUTES } from '@/config/routes';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState<string | null>(null);
  const [linkExpired, setLinkExpired] = useState(false);

  // @supabase/supabase-js の標準クライアント（URLハッシュ自動検出対応）
  const supabaseRef = useRef(
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );

  useEffect(() => {
    const supabase = supabaseRef.current;

    // ===== URLハッシュのエラーチェック =====
    // リンク期限切れ等の場合: #error=access_denied&error_code=otp_expired&...
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('error=')) {
        const params = new URLSearchParams(hash.substring(1));
        const errorCode = params.get('error_code');
        const errorDesc = params.get('error_description');

        if (errorCode === 'otp_expired' || errorDesc?.includes('expired')) {
          setLinkExpired(true);
          return; // イベントリスナーは不要
        }

        // その他のエラー
        setError(errorDesc || '認証エラーが発生しました。');
        return;
      }
    }

    // ===== PASSWORD_RECOVERY イベントを待つ =====
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
        setRecoveryEmail(session?.user?.email || null);
        console.log('PASSWORD_RECOVERY event:', session?.user?.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
      const supabase = supabaseRef.current;

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      await supabase.auth.signOut();

      alert('✅ パスワードの設定が完了しました。\nログイン画面からログインしてください。');
      window.location.href = APP_ROUTES.AUTH.LOGIN;
    } catch (err) {
      console.error('パスワード設定エラー:', err);
      setError('予期せぬエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">パスワード設定</h2>

        {/* ===== リンク期限切れ ===== */}
        {linkExpired ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full">
              <span className="text-3xl">⏰</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              リンクの有効期限が切れています
            </h3>
            <p className="text-sm text-gray-500">
              このパスワード設定リンクは無効です。<br />
              管理者に連絡して、メールを再送信してもらってください。
            </p>
            <a
              href={APP_ROUTES.AUTH.LOGIN}
              className="inline-block mt-4 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              ログイン画面へ
            </a>
          </div>

        /* ===== リカバリーセッション待ち ===== */
        ) : !ready ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-sm text-gray-500">
              認証情報を確認しています...
            </p>
          </div>

        /* ===== パスワード設定フォーム ===== */
        ) : (
          <>
            {recoveryEmail && (
              <div className="bg-blue-50 text-blue-700 p-3 rounded text-sm text-center">
                <span className="font-medium">{recoveryEmail}</span> のパスワードを設定します
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="6文字以上"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  パスワード確認
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="もう一度入力してください"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '設定中...' : 'パスワードを設定する'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
