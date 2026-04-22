import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { APP_ROUTES } from '@/config/routes'

export async function middleware(request: NextRequest) {
  // Supabase セッション更新とUser情報の取得 (Edge Runtime)
  const { response, user, supabase } = await updateSession(request)

  const pathname = request.nextUrl.pathname
  const isApiRoute =
    pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')

  // アクセスログは GET（実際のページ表示）のみ。POST は Server Action / Form 送信がほとんどで、
  // Edge で毎回 await insert すると大きい multipart 時にタイムアウトし、RSC 以外の応答になり
  // 「An unexpected response was received from the server」になることがある。
  const shouldRecordPageView =
    request.method === 'GET' && !pathname.startsWith('/_next') && !pathname.includes('.')
  const isAuthPage = 
    pathname.startsWith(APP_ROUTES.AUTH.LOGIN) || 
    pathname.startsWith(APP_ROUTES.AUTH.RESET_PASSWORD) || 
    pathname.startsWith(APP_ROUTES.AUTH.FORGOT_PASSWORD) || 
    pathname.startsWith(APP_ROUTES.AUTH.SIGNUP) || 
    pathname.startsWith('/api/auth')
  const isPublicPage = pathname === '/'

  if (shouldRecordPageView) {
    const insertLog = async () => {
      try {
        let tenant_id = user?.user_metadata?.tenant_id || null;
        
        // user_metadata に tenant_id が無い場合（大半の従業員用）、employees テーブルから裏で非同期補完
        if (!tenant_id && user?.id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data } = await supabase.from('employees' as any).select('tenant_id').eq('user_id', user.id).single();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const emp = data as any;
          if (emp?.tenant_id) {
            tenant_id = emp.tenant_id;
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from('access_logs' as any).insert({
          action: 'PAGE_VIEW',
          path: pathname,
          method: request.method,
          ip_address: request.headers.get('x-forwarded-for') || null,
          user_agent: request.headers.get('user-agent') || null,
          tenant_id: tenant_id,
          user_id: user?.id || null,
          details: {
            search_params: Object.fromEntries(request.nextUrl.searchParams)
          }
        });

        if (error) {
          console.error('[Middleware] access_logs insert error:', error.message);
        }
      } catch (err) {
        console.error('[Middleware] insertLog unexpected error:', err);
      }
    };
    // Supabase JSの非同期fetchが中断されないよう、awaitで確実に処理を待ってから返す
    await insertLog();
  }

  // API は JSON で 401 を返す（fetch が HTML ログインページを受け取り「不正な応答」になるのを防ぐ）
  if (!user && isApiRoute) {
    return NextResponse.json(
      { ok: false, error: 'ログインが必要です' },
      { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    )
  }

  // 未認証ユーザーが保護されたページにアクセス
  if (!user && !isAuthPage && !isPublicPage) {
    return NextResponse.redirect(new URL(APP_ROUTES.AUTH.LOGIN, request.url))
  }

  // 認証済みユーザーのルーティング
  if (user) {
    // パスワード設定ページはリカバリーフロー中なのでリダイレクトしない
    const isResetPassword = pathname.startsWith('/reset-password')
    // ログイン済みユーザーがログインページ等にアクセスした場合はTOPへ（パスワード設定を除く）
    if ((isAuthPage || isPublicPage) && !isResetPassword) {
      return NextResponse.redirect(new URL(APP_ROUTES.TENANT.PORTAL, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}