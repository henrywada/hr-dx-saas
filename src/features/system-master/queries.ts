import { createAdminClient } from '@/lib/supabase/admin'
import { resolvePageFilePath } from '@/lib/route-resolver'

type ClassIndexRow = {
  service_category_id: string | null
  service_class_id: string | null
}

type SortOrderRow = {
  id: string
  sort_order: number | null
}

/** カテゴリ ID → service_class.sort_order のマップ（未紐付けは末尾） */
function buildCategoryClassSortMap(
  classIndex: ClassIndexRow[],
  classes: SortOrderRow[]
): Map<string, number> {
  const classSortById = new Map(
    classes.map(c => [c.id, c.sort_order ?? Number.MAX_SAFE_INTEGER])
  )
  const map = new Map<string, number>()
  for (const row of classIndex) {
    if (!row.service_category_id || !row.service_class_id) continue
    map.set(
      row.service_category_id,
      classSortById.get(row.service_class_id) ?? Number.MAX_SAFE_INTEGER
    )
  }
  return map
}

function compareClassCategoryServiceSort(
  categoryIdA: string | null | undefined,
  categoryIdB: string | null | undefined,
  categorySortA: number | null | undefined,
  categorySortB: number | null | undefined,
  serviceSortA: number | null | undefined,
  serviceSortB: number | null | undefined,
  classSortMap: Map<string, number>
): number {
  const classA = categoryIdA
    ? (classSortMap.get(categoryIdA) ?? Number.MAX_SAFE_INTEGER)
    : Number.MAX_SAFE_INTEGER
  const classB = categoryIdB
    ? (classSortMap.get(categoryIdB) ?? Number.MAX_SAFE_INTEGER)
    : Number.MAX_SAFE_INTEGER
  if (classA !== classB) return classA - classB

  const catA = categorySortA ?? Number.MAX_SAFE_INTEGER
  const catB = categorySortB ?? Number.MAX_SAFE_INTEGER
  if (catA !== catB) return catA - catB

  return (serviceSortA ?? 0) - (serviceSortB ?? 0)
}

async function fetchClassSortContext() {
  const supabase = createAdminClient()
  const [classIndexRes, classesRes] = await Promise.all([
    supabase.from('service_class_index').select('service_category_id, service_class_id'),
    supabase.from('service_class').select('id, sort_order'),
  ])

  if (classIndexRes.error) {
    console.error('fetchClassSortContext classIndex error:', classIndexRes.error)
  }
  if (classesRes.error) {
    console.error('fetchClassSortContext classes error:', classesRes.error)
  }

  return buildCategoryClassSortMap(classIndexRes.data ?? [], classesRes.data ?? [])
}

export async function getServiceClasses() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('service_class')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('getServiceClasses error:', error)
    return []
  }
  return data || []
}

export async function getServiceClassIndex() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('service_class_index').select('*')

  if (error) {
    console.error('getServiceClassIndex error:', error)
    return []
  }
  return data || []
}

export async function getServiceCategories() {
  const supabase = createAdminClient()
  const [categoriesRes, classSortMap] = await Promise.all([
    supabase.from('service_category').select('*'),
    fetchClassSortContext(),
  ])

  if (categoriesRes.error) {
    console.error('getServiceCategories error:', categoriesRes.error)
    return []
  }

  const rows = categoriesRes.data || []
  // 表示順: service_class.sort_order → service_category.sort_order
  rows.sort((a, b) =>
    compareClassCategoryServiceSort(
      a.id,
      b.id,
      a.sort_order,
      b.sort_order,
      0,
      0,
      classSortMap
    )
  )
  return rows
}

/**
 * 各サービス行に、route_path に対応する page.tsx が実在するかどうかのフラグを付与する。
 * resolver は第2引数として注入可能（テスト時に固定の結果を返すスタブを渡すため）。
 */
export function withAiAdviceAvailability<T extends { route_path?: string | null }>(
  rows: T[],
  resolver: (routePath: string) => string | null = resolvePageFilePath
): (T & { ai_advice_available: boolean })[] {
  return rows.map(row => ({
    ...row,
    ai_advice_available: resolver(row.route_path || '') !== null,
  }))
}

export async function getServices() {
  const supabase = createAdminClient()
  const [servicesRes, classSortMap] = await Promise.all([
    supabase.from('service').select(`
      *,
      service_category (
        sort_order
      )
    `),
    fetchClassSortContext(),
  ])

  if (servicesRes.error) {
    console.error('getServices error:', servicesRes.error)
    return []
  }

  const rows = servicesRes.data || []
  // 表示順: service_class.sort_order → service_category.sort_order → service.sort_order
  rows.sort((a, b) =>
    compareClassCategoryServiceSort(
      a.service_category_id,
      b.service_category_id,
      a.service_category?.sort_order,
      b.service_category?.sort_order,
      a.sort_order,
      b.sort_order,
      classSortMap
    )
  )

  const withoutCategory = rows.map(({ service_category: _c, ...rest }) => rest)
  return withAiAdviceAvailability(withoutCategory)
}

export async function getAppRoles() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('app_role').select('*')

  if (error) {
    console.error('getAppRoles error:', error)
    return []
  }
  const rows = data || []
  // マトリクス等の表示順: app_role コード順（null は末尾）
  rows.sort((a, b) =>
    String(a.app_role ?? '\uffff').localeCompare(String(b.app_role ?? '\uffff'), 'ja')
  )
  return rows
}

export async function getTenants() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) {
    console.error('getTenants error:', error)
    return []
  }
  return data || []
}
