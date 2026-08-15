import type { DashboardScreen, UiDashboardElement } from './types'

export type VisibilityElement = Pick<
  UiDashboardElement,
  'id' | 'element_key' | 'service_id' | 'screen' | 'is_active'
>

/**
 * /top・/adm と同じ表示判定。
 * service_id がある要素は tenant_service 契約が必要。
 * hiddenElementIds は is_visible === false のオーバーライド。
 */
export function isDashboardElementShown(
  el: VisibilityElement,
  contractedServiceIds: Set<string>,
  hiddenElementIds: Set<string>
): boolean {
  if (!el.is_active) return false
  if (el.service_id != null && !contractedServiceIds.has(el.service_id)) return false
  if (hiddenElementIds.has(el.id)) return false
  return true
}

export type PreviewService = {
  id: string
  target_audience?: string | null
  release_status?: string | null
  service_category_id?: string | null
}

export type PreviewCategory = {
  id: string
  name: string
  sort_order?: number | null
}

export type PreviewClass = {
  id: string
  name: string
  sort_order?: number | null
}

export type PreviewClassIndex = {
  service_category_id?: string | null
  service_class_id?: string | null
}

export type SidebarClassGroup = {
  id: string
  name: string
  categories: { id: string; name: string }[]
}

/**
 * AppSidebar と同じ：契約＋公開＋画面別 audience のカテゴリをクラスで束ねる。
 * ロール制限（app_role_service）はシミュレーションでは見ない。
 */
export function buildSidebarClassGroups(
  screen: DashboardScreen,
  contractedServiceIds: Set<string>,
  services: PreviewService[],
  categories: PreviewCategory[],
  classes: PreviewClass[],
  classIndex: PreviewClassIndex[]
): SidebarClassGroup[] {
  const audience = screen === 'adm' ? 'adm' : 'all_users'
  const categoryIds = new Set<string>()
  for (const s of services) {
    if (!contractedServiceIds.has(s.id)) continue
    if (s.target_audience !== audience) continue
    if (s.release_status !== '公開') continue
    if (s.service_category_id) categoryIds.add(s.service_category_id)
  }

  const classByCategory = new Map<string, string>()
  for (const row of classIndex) {
    if (row.service_category_id && row.service_class_id) {
      classByCategory.set(row.service_category_id, row.service_class_id)
    }
  }

  const classMap = new Map(classes.map(c => [c.id, c]))
  const groups = new Map<string, { sort: number; name: string; categories: PreviewCategory[] }>()

  for (const cat of categories) {
    if (!categoryIds.has(cat.id)) continue
    if (cat.name === 'ダッシュボード') continue
    const classId = classByCategory.get(cat.id)
    if (!classId) continue
    const sc = classMap.get(classId)
    if (!sc) continue
    if (!groups.has(classId)) {
      groups.set(classId, { sort: sc.sort_order ?? 0, name: sc.name, categories: [] })
    }
    groups.get(classId)!.categories.push(cat)
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[1].sort - b[1].sort)
    .map(([id, g]) => ({
      id,
      name: g.name,
      categories: g.categories
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(c => ({ id: c.id, name: c.name })),
    }))
}

export function visibleKeysForScreen(
  elements: VisibilityElement[],
  screen: DashboardScreen,
  contractedServiceIds: Set<string>,
  hiddenElementIds: Set<string>
): Set<string> {
  const keys = new Set<string>()
  for (const el of elements) {
    if (el.screen !== screen) continue
    if (!isDashboardElementShown(el, contractedServiceIds, hiddenElementIds)) continue
    keys.add(el.element_key)
  }
  return keys
}
