import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { APP_ROUTES } from '@/config/routes'
import { buildHostRedirectUrl, isMyouHost, resolveHostRedirect } from '@/lib/auth/host'
import { resolveTenantId, shouldDenyForHost } from '@/lib/auth/resolve-tenant-id'
import { getMyouTenantIds } from '@/lib/auth/tenant-audience'
import {
  STATIC_SECURITY_HEADERS,
  buildAppCsp,
  buildLiffCsp,
  buildScormContentCsp,
  getCspHeaderName,
  getCspMode,
  isLiffPath,
  isScormContentPath,
} from '@/lib/security/headers'

/**
 * GitHub Actions cron から呼ばれるバッチ実行エンドポイント。
 * ログインセッションを持たないため通常の 401 ガードから除外する。
 * 各ルートが x-cron-secret ヘッダーを自前で検証しており、素通りにはならない。
 */
const CRON_API_PATHS = ['/api/auto-distribution/run-due', '/api/grant-notifier/run-batch']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isDev = process.env.NODE_ENV === 'development'
  const cspMode = getCspMode()

  // CSP 選択：SCORM 教材 → LIFF → アプリ本体の順で専用 CSP を適用する。
  // SCORM は第三者製 HTML/JS の eval が必須なため緩和 CSP。
  // LIFF は LINE SDK オリジンを許可する専用 CSP（アプリ全体への影響を避けるため分離）。
  const csp = isScormContentPath(pathname)
    ? buildScormContentCsp()
    : isLiffPath(pathname)
      ? buildLiffCsp(isDev)
      : buildAppCsp(isDev)

  const applySecurityHeaders = (target: NextResponse): NextResponse => {
    for (const { key, value } of STATIC_SECURITY_HEADERS) {
      target.headers.set(key, value)
    }
    target.headers.set(getCspHeaderName(cspMode), csp)
    return target
  }

  // Supabase セッション更新とUser情報の取得 (Edge Runtime)
  const { response, user, supabase } = await updateSession(request)
  applySecurityHeaders(response)
  const isMyou = isMyouHost(request.headers.get('host'))
  const isCronApiRoute = CRON_API_PATHS.includes(pathname)
  // LINE Webhook は未ログイン状態で呼ばれる外部リクエストのため、JSON 401 ガードから除外する
  const isLineApiRoute = pathname.startsWith('/api/line/')
  const isApiRoute =
    pathname.startsWith('/api/') &&
    !pathname.startsWith('/api/auth') &&
    !isCronApiRoute &&
    !isLineApiRoute

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
  // ルートパス自体（未ログイン向けトップ）。ログイン済みなら /top へ誘導する対象
  const isMarketingRoot = pathname === '/'
  // /p/ 配下はパブリックページ（認証不要）。ログイン状態に関わらずそのまま表示する
  // （QRコード・メールリンク等から一般ユーザーがログインなしで開く想定のため）
  const isPublicPortalPage = pathname.startsWith('/p/')
  const isPublicPage = isMarketingRoot || isPublicPortalPage

  // ホスト⇔テナント整合チェック（多層防御）。
  // どの経路でセッションが作られても、app と myou のユーザーがドメインを跨げないようにする。
  let resolvedTenantId: string | null = null
  if (user) {
    const resolved = await resolveTenantId(supabase, user)
    resolvedTenantId = resolved.tenantId
    // DB エラー時は判定を保留（一時的な障害で全員をログアウトさせない）
    if (resolved.failed) {
      console.warn('[Middleware] テナント解決失敗のためホスト整合チェックを保留')
    }
    if (shouldDenyForHost(isMyou, resolved, getMyouTenantIds())) {
      // scope: 'local' で今のセッションだけ破棄する（他端末の正当なセッションを巻き込まない）
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })
      if (signOutError) {
        console.error('[Middleware] signOut error:', signOutError.message)
      }
      const loginPath = isMyou ? APP_ROUTES.AUTH.LOGIN_MYOU : APP_ROUTES.AUTH.LOGIN
      const denied = pathname.startsWith('/api/')
        ? NextResponse.json({ ok: false, error: 'アクセス権がありません' }, { status: 403 })
        : NextResponse.redirect(new URL(loginPath, request.url))
      // updateSession の response は setAll 内で作り直されるため、sb-* Cookie を明示的に削除する
      request.cookies
        .getAll()
        .filter(c => c.name.startsWith('sb-'))
        .forEach(c => denied.cookies.set(c.name, '', { maxAge: 0, path: '/' }))
      return applySecurityHeaders(denied)
    }
  }

  if (shouldRecordPageView) {
    const insertLog = async () => {
      try {
        // テナント ID は認証済みリクエストごとに 1 回だけ解決した結果を共有する
        const tenant_id = resolvedTenantId

        // ── トークン含みパスのマスキング ──────────────────────────────
        // 招待トークン・LIFF state に生トークンが含まれるパスはログに残さない。
        // ルート自体（トラフィック確認用）は記録し、トークン部分のみ [token] に置換する。
        const TOKEN_PREFIXES = ['/p/line-friend-invite/', '/liff/friend-link/'] as const
        const matchedPrefix = TOKEN_PREFIXES.find(p => pathname.startsWith(p))
        const isTokenPath = matchedPrefix !== undefined
        const logPath = isTokenPath ? `${matchedPrefix}[token]` : pathname

        // トークン含みパスでは search_params を一切保存しない（liff.state 等にトークンが混入するため）
        // それ以外のパスでも liff.state キーは [redacted] に置換する
        const rawSearchParams = Object.fromEntries(request.nextUrl.searchParams)
        const logSearchParams: Record<string, string> = isTokenPath
          ? {}
          : Object.fromEntries(
              Object.entries(rawSearchParams).map(([k, v]) =>
                k === 'liff.state' ? [k, '[redacted]'] : [k, v]
              )
            )
        // ─────────────────────────────────────────────────────────────

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from('access_logs' as any).insert({
          action: 'PAGE_VIEW',
          path: logPath,
          method: request.method,
          ip_address: request.headers.get('x-forwarded-for') || null,
          user_agent: request.headers.get('user-agent') || null,
          tenant_id: tenant_id,
          user_id: user?.id || null,
          details: {
            search_params: logSearchParams,
          },
        })

        if (error) {
          console.error('[Middleware] access_logs insert error:', error.message)
        }
      } catch (err) {
        console.error('[Middleware] insertLog unexpected error:', err)
      }
    }
    // Supabase JSの非同期fetchが中断されないよう、awaitで確実に処理を待ってから返す
    await insertLog()
  }

  // ホストと画面の組み合わせ補正（app ↔ myou の画面を混在させない）
  const hostRedirect = resolveHostRedirect(pathname, isMyou, !!user)
  if (hostRedirect) {
    // クエリ文字列を保持する（reset-password の token/email や /login?error= を失わないため）
    return applySecurityHeaders(
      NextResponse.redirect(buildHostRedirectUrl(request.url, hostRedirect))
    )
  }

  // API は JSON で 401 を返す（fetch が HTML ログインページを受け取り「不正な応答」になるのを防ぐ）
  if (!user && isApiRoute) {
    return applySecurityHeaders(
      NextResponse.json(
        { ok: false, error: 'ログインが必要です' },
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      )
    )
  }

  // 未認証ユーザーが保護されたページにアクセス
  // （cron エンドポイントはルート側で x-cron-secret を検証するため /login へ飛ばさない）
  // （/liff は LIFF ブラウザ内で LINE 認証を行うため /login へリダイレクトしない）
  // （LINE Webhook は外部サービスからの POST のため /login へリダイレクトしない）
  if (
    !user &&
    !isAuthPage &&
    !isPublicPage &&
    !isCronApiRoute &&
    !isLineApiRoute &&
    !isLiffPath(pathname)
  ) {
    return applySecurityHeaders(
      NextResponse.redirect(
        new URL(isMyou ? APP_ROUTES.AUTH.LOGIN_MYOU : APP_ROUTES.AUTH.LOGIN, request.url)
      )
    )
  }

  // 認証済みユーザーのルーティング
  if (user) {
    // パスワード設定ページはリカバリーフロー中なのでリダイレクトしない
    const isResetPassword = pathname.startsWith('/reset-password')
    // ログイン済みユーザーがログインページ・マーケティングトップにアクセスした場合はTOPへ誘導する
    // （パスワード設定・/p/ 配下の公開ページを除く。/p/ はログイン状態に関わらずそのまま表示する）
    if ((isAuthPage || isMarketingRoot) && !isResetPassword) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL(APP_ROUTES.TENANT.PORTAL, request.url))
      )
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
