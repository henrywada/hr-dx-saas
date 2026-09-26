export interface AccessLog {
  id: string
  created_at: string
  action: string
  path: string | null
  employee_name: string | null
  email: string | null
  tenant_id: string | null
  tenant_name: string | null
}

export interface AccessLogRow extends AccessLog {
  is_login: boolean
  is_logout: boolean
  /** PAGE_VIEW のとき、URL パスに対応する service.name（未登録は null） */
  page_name: string | null
  /** PAGE_VIEW のときのみ URL パス */
  page_path: string | null
  /** ログイン/ログアウト/ページ閲覧以外の action（重要操作） */
  operation: string | null
}

const ACTION_LOGIN = 'LOGIN_SUCCESS'
const ACTION_LOGOUT = 'LOGOUT'
const ACTION_PAGE_VIEW = 'PAGE_VIEW'

export interface ServiceRoute {
  name: string | null
  route_path: string | null
}

export type PageNameResolver = (path: string | null) => string | null

/** 末尾スラッシュを除いた正規化（ルート '/' は空文字になる） */
function normalizePath(path: string): string {
  return path.trim().replace(/\/+$/, '')
}

/**
 * URL パス → service.name の解決関数を作る。
 * route_path と完全一致、なければ末尾のパスセグメントを 1 つずつ削って親の route_path に一致させる
 * （動的パス /adm/xxx/123 → /adm/xxx）。route_path が重複する場合は先に現れた方を採用。
 */
export function buildPageNameResolver(services: ServiceRoute[]): PageNameResolver {
  const nameByPath = new Map<string, string>()
  for (const s of services) {
    if (!s.route_path || !s.name) continue
    const key = normalizePath(s.route_path)
    if (key && !nameByPath.has(key)) nameByPath.set(key, s.name)
  }

  return path => {
    if (!path) return null
    let current = normalizePath(path)
    while (current) {
      const hit = nameByPath.get(current)
      if (hit) return hit
      current = current.slice(0, current.lastIndexOf('/'))
    }
    return null
  }
}

/** access_logs の 1 行を、列（ログイン/ログアウト/ページ/重要操作）ごとの表示用に振り分ける */
export function toAccessLogRow(log: AccessLog, resolvePageName: PageNameResolver): AccessLogRow {
  const isLogin = log.action === ACTION_LOGIN
  const isLogout = log.action === ACTION_LOGOUT
  const isPageView = log.action === ACTION_PAGE_VIEW
  return {
    ...log,
    is_login: isLogin,
    is_logout: isLogout,
    page_name: isPageView ? resolvePageName(log.path) : null,
    page_path: isPageView ? log.path : null,
    operation: isLogin || isLogout || isPageView ? null : log.action,
  }
}
