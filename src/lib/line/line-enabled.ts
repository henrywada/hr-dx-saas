// MYOU 用の環境変数が未設定（myouTenantIds が空）の場合は LINE 連携は有効のまま（従来動作・仕様）
/** MYOU テナントは LINE 連携を使わない。それ以外は従来どおり有効 */
export function isLineEnabledForTenant(
  tenantId: string | null | undefined,
  myouTenantIds: string[]
): boolean {
  return !(tenantId && myouTenantIds.includes(tenantId))
}
