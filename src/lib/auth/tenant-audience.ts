/** ログイン画面の種別。default = app.hr-dx.jp/login、myou = myou.hr-dx.jp/login-myou */
export type LoginAudience = 'default' | 'myou'

/** 環境変数から MYOU 系テナント ID 一覧を取得（未設定・空は除外） */
export function getMyouTenantIds(env: Record<string, string | undefined> = process.env): string[] {
  return [env.MYOU_PUBLIC_TENANT_ID, env.MYOU_LOCAL_TENANT_ID]
    .map(v => v?.trim())
    .filter((v): v is string => !!v)
}

/** 画面種別ごとのログイン可否。myou 側は fail closed（不明・未設定は拒否） */
export function isTenantAllowedForAudience(
  audience: LoginAudience,
  tenantId: string | null | undefined,
  myouTenantIds: string[]
): boolean {
  const isMyou = !!tenantId && myouTenantIds.includes(tenantId)
  return audience === 'myou' ? isMyou : !isMyou
}
