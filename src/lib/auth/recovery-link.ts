import { getMyouTenantIds } from './tenant-audience'

type Env = Record<string, string | undefined>

/** パスワード設定リンクを組み立てる。MYOU テナントは myou ドメイン、それ以外は app ドメイン */
export function buildRecoveryLink(params: {
  tenantId: string | null | undefined
  token: string
  email: string
  env?: Env
}): string {
  const { tenantId, token, email, env = process.env } = params
  const query = `token=${token}&email=${encodeURIComponent(email)}`
  if (tenantId && getMyouTenantIds(env).includes(tenantId)) {
    const myouUrl = env.MYOU_SITE_URL || 'https://myou.hr-dx.jp'
    return `${myouUrl}/reset-password-myou?${query}`
  }
  const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${appUrl}/reset-password?${query}`
}

/** user_id から employees.tenant_id を引く。失敗時は null（従来の app リンクにフォールバック） */
export async function lookupTenantIdForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('tenant_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    console.error('[recovery-link] テナント ID の取得に失敗:', error.message)
    return null
  }
  return (data as { tenant_id?: string | null } | null)?.tenant_id ?? null
}
