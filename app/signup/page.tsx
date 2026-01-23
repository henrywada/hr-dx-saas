'use client'

import { createClient } from '@supabase/supabase-js'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Signup() {
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const router = useRouter()
    const searchParams = useSearchParams()

    // URLから情報を取得
    const email = searchParams.get('email') || ''
    const code = searchParams.get('code') || ''

    // Supabaseクライアントを直接作成（これでライブラリエラーを回避）
    // ※ ローカル開発環境の環境変数を直接読み込みます
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isSubmitting) return

        setError(null)

        if (password !== passwordConfirm) {
            setError('パスワードが一致しません')
            return
        }

        if (!code) {
            setError('認証コードが見つかりません。URLを確認してください。')
            return
        }

        try {
            setIsSubmitting(true)

            // 1. コード検証（ログイン）
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token: code,
                type: 'invite',
            })

            if (verifyError) throw verifyError

            // 2. パスワード設定
            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            })

            if (updateError) {
                // 同じパスワードエラーは成功とみなす
                if (updateError.message.includes("different from the old password")) {
                    console.log("重複エラーを無視して進行します")
                    router.push('/portal')
                    return
                }
                throw updateError
            }

            // 3. 成功したらポータルへ
            router.push('/portal')

        } catch (err: any) {
            console.error(err)
            setError(err.message)
            setIsSubmitting(false)
        }
    }

    // マジックリンク（ハッシュ）経由のアクセスを検知して警告または自動処理
    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.hash && !code) {
            console.warn('Magic Link hash detected. Config might be wrong.')
            // 必要であればここで自動ログインを試みることも可能ですが、
            // 今回はDeferred Auth（URLパラメータ）前提のため警告のみとします。
            setError('無効なリンク形式です（マジックリンクが検出されました）。管理者に連絡してください。')
        }
    }, [code])

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 bg-white p-8 shadow rounded">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                        アカウントの認証
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        パスワードを設定して、アカウント登録を完了してください。
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
                        {error}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="-space-y-px rounded-md shadow-sm">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                メールアドレス
                            </label>
                            <input
                                type="email"
                                disabled
                                value={email}
                                className="block w-full rounded-md border-gray-300 bg-gray-100 px-3 py-2 text-gray-500 sm:text-sm"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                パスワード設定
                            </label>
                            <input
                                type="password"
                                required
                                disabled={isSubmitting}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full rounded-md border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                placeholder="パスワードを入力"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                パスワード確認
                            </label>
                            <input
                                type="password"
                                required
                                disabled={isSubmitting}
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                className="block w-full rounded-md border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                placeholder="もう一度入力してください"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`group relative flex w-full justify-center rounded-md border border-transparent py-2 px-4 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            {isSubmitting ? '処理中...' : '登録を完了してログイン'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}