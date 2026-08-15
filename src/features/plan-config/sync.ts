/** プランテンプレート同期の判定ヘルパー（DB I/O なし） */

export type ServiceSyncRow = { service_id: string; status: string | null }

export function isSyncTargetTenant(
  row: { plan_type: string; is_template: boolean },
  planType: string
): boolean {
  return row.plan_type === planType && row.is_template === false
}

/** テンプレートにサービスが無いときは既存テナントの契約機能を空にしない */
export function canReplaceTenantServices(templateServiceCount: number): boolean {
  return templateServiceCount > 0
}

/** 対象プランの既存テナントが1件以上あるときだけ同期ボタンを有効にする */
export function canEnablePlanSync(existingTenantCount: number): boolean {
  return existingTenantCount > 0
}

export type ServiceSyncDiff = {
  toAdd: ServiceSyncRow[]
  toRemove: ServiceSyncRow[]
  toUpdateStatus: ServiceSyncRow[]
}

export function classifyServiceSync(
  current: ServiceSyncRow[],
  template: ServiceSyncRow[]
): ServiceSyncDiff {
  const currentById = new Map(current.map(r => [r.service_id, r]))
  const templateById = new Map(template.map(r => [r.service_id, r]))

  return {
    toAdd: template.filter(t => !currentById.has(t.service_id)),
    toRemove: current.filter(c => !templateById.has(c.service_id)),
    toUpdateStatus: template.filter(t => {
      const existing = currentById.get(t.service_id)
      return existing != null && existing.status !== t.status
    }),
  }
}
