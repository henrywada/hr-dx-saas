/** MYOU テナントは LINE 連携を使わない。それ以外は従来どおり有効 */
export function isLineEnabledForTenant(
  tenantId: string | null | undefined,
  myouTenantIds: string[]
): boolean {
  return !(tenantId && myouTenantIds.includes(tenantId))
}
