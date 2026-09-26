import type { LoginAudience } from './tenant-audience'

/** MYOU 用ホスト名（完全一致のみ）。myou.localhost はローカル検証用（Chrome は *.localhost を 127.0.0.1 に解決する） */
const MYOU_HOSTS = ['myou.hr-dx.jp', 'myou.localhost']

/** myou.hr-dx.jp（ポート・大文字は無視）かどうか */
export function isMyouHost(host: string | null | undefined): boolean {
  return !!host && MYOU_HOSTS.includes(host.toLowerCase().split(':')[0])
}

/** 画面種別（audience）と実際のホストが一致しているか。クライアントが渡す audience を鵜呑みにしないために使う */
export function isHostAudienceConsistent(
  host: string | null | undefined,
  audience: LoginAudience
): boolean {
  return isMyouHost(host) === (audience === 'myou')
}

/** ホストと画面の組み合わせが不正なら、正しい画面のパスを返す（問題なければ null） */
export function resolveHostRedirect(
  pathname: string,
  isMyou: boolean,
  hasUser: boolean
): string | null {
  const p = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname
  if (isMyou) {
    if (!hasUser && (p === '/' || p === '/login')) return '/login-myou'
    if (p === '/forgot-password') return '/forgot-password-myou'
    if (p === '/reset-password') return '/reset-password-myou'
    if (p === '/signup' || p.startsWith('/signup/')) return '/login-myou'
    return null
  }
  if (p === '/login-myou') return '/login'
  if (p === '/forgot-password-myou') return '/forgot-password'
  if (p === '/reset-password-myou') return '/reset-password'
  return null
}

/** リダイレクト先 URL を組み立てる。クエリ文字列（token / email / error 等）を引き継ぐ */
export function buildHostRedirectUrl(requestUrl: string | URL, path: string): URL {
  const url = new URL(requestUrl)
  url.pathname = path
  return url
}
