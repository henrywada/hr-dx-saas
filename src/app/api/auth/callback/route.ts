import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Supabase Auth Callback (Auth Code Exchange)
 * 
 * メール内のリンク（パスワードリセット、招待、メール確認等）をクリックした際に
 * Supabaseがリダイレクトするエンドポイント。
 * 認証コードをセッショントークンに交換し、指定されたリダイレクト先へリダイレクトする。
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/reset-password'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // コードが無い or 交換失敗 → ログインページへ
  return NextResponse.redirect(`${origin}/login?error=callback_failed`)
}
