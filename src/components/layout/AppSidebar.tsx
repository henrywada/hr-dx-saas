import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { SidebarNav } from './SidebarNav'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'

interface ServiceClass {
  id: string
  name: string
  sort_order: number
}

interface Category {
  id: string
  name: string
  sort_order: number
}

interface ClassGroup {
  id: string
  name: string
  categories: Category[]
}

function groupCategoriesByClass(
  categories: Category[],
  serviceClasses: ServiceClass[],
  classIndexMap: Map<string, string>
): ClassGroup[] {
  const classMap = new Map(serviceClasses.map(sc => [sc.id, sc]))
  const groups = new Map<string, { class: ServiceClass; categories: Category[] }>()

  for (const category of categories) {
    if (category.name === 'ダッシュボード') continue
    const classId = classIndexMap.get(category.id)
    if (!classId || !classMap.has(classId)) continue

    const serviceClass = classMap.get(classId)!
    if (!groups.has(classId)) {
      groups.set(classId, { class: serviceClass, categories: [] })
    }
    groups.get(classId)!.categories.push(category)
  }

  return Array.from(groups.values())
    .sort((a, b) => a.class.sort_order - b.class.sort_order)
    .map(g => ({
      id: g.class.id,
      name: g.class.name,
      categories: g.categories.sort((a, b) => a.sort_order - b.sort_order),
    }))
}

export async function AppSidebar({ variant }: { variant: 'portal' | 'admin' | 'saas' }) {
  const supabase = await createClient()
  const user = await getServerUser()

  const tenantId = user?.tenant_id
  const userName = user?.name || ''
  const tenantName = variant === 'saas' ? 'SaaS管理' : user?.tenant_name || ''

  let dynamicCategories: Category[] = []
  let classGroups: ClassGroup[] = []
  let overviewLabel = '概要'

  if (variant === 'saas') {
    const { data: services } = await supabase
      .from('service')
      .select(`id, service_category:service_category_id(id, name, sort_order)`)
      .eq('target_audience', 'saas_adm')
      .eq('release_status', '公開')

    if (services) {
      const categoryMap = new Map<string, Category>()
      services.forEach((service: { service_category: unknown }) => {
        const category = service.service_category as Category | null | undefined
        if (category && !categoryMap.has(category.id)) {
          categoryMap.set(category.id, category)
        }
      })
      dynamicCategories = Array.from(categoryMap.values()).sort(
        (a, b) => a.sort_order - b.sort_order
      )
    }

    const { data: serviceClasses } = await supabase
      .from('service_class')
      .select('id, name, sort_order')
      .order('sort_order', { ascending: true })

    const { data: classIndexData } = await supabase
      .from('service_class_index')
      .select('service_class_id, service_category_id')

    if (serviceClasses && classIndexData) {
      const classIndexMap = new Map(
        classIndexData.map(ci => [ci.service_category_id, ci.service_class_id])
      )
      classGroups = groupCategoriesByClass(
        dynamicCategories,
        serviceClasses as ServiceClass[],
        classIndexMap
      )
      const overviewClass = serviceClasses.find(sc => sc.name === '概要')
      if (overviewClass) {
        overviewLabel = overviewClass.name
      }
    }
  } else if (tenantId) {
    // テナントが契約しているサービスIDを取得
    const { data: tenantServices } = await supabase
      .from('tenant_service')
      .select('service_id')
      .eq('tenant_id', tenantId)

    const tenantServiceIds = tenantServices?.map(ts => ts.service_id) || []

    if (tenantServiceIds.length > 0) {
      // admin: target_audience='adm' のサービスを取得
      // portal: target_audience='all_users' のサービスを取得
      const targetAudience = variant === 'admin' ? 'adm' : 'all_users'

      const { data: services } = await supabase
        .from('service')
        .select(`id, service_category:service_category_id(id, name, sort_order)`)
        .eq('target_audience', targetAudience)
        .eq('release_status', '公開')
        .in('id', tenantServiceIds)

      let filteredServices = services ?? []

      // app_role によるフィルタ（admin のみ）: app_role_service で制限されたサービスは該当ロールのみ表示
      if (variant === 'admin' && filteredServices.length > 0) {
        const serviceIds = filteredServices.map((s: { id: string }) => s.id)
        const { data: roleServices } = await supabase
          .from('app_role_service')
          .select('service_id, app_role_id')
          .in('service_id', serviceIds)

        const serviceToRoles = new Map<string, Set<string>>()
        for (const rs of roleServices ?? []) {
          if (!rs.service_id || !rs.app_role_id) continue
          const set = serviceToRoles.get(rs.service_id) ?? new Set()
          set.add(rs.app_role_id)
          serviceToRoles.set(rs.service_id, set)
        }

        const appRole = user?.appRole
        let userAppRoleId: string | null = null
        if (appRole) {
          const { data: roleRow } = await supabase
            .from('app_role')
            .select('id')
            .eq('app_role', appRole)
            .single()
          userAppRoleId = roleRow?.id ?? null
        }

        filteredServices = filteredServices.filter((s: { id: string }) => {
          const restrictedRoles = serviceToRoles.get(s.id)
          if (!restrictedRoles || restrictedRoles.size === 0) return true
          return userAppRoleId != null && restrictedRoles.has(userAppRoleId)
        })
      }

      if (filteredServices.length > 0) {
        const categoryMap = new Map<string, Category>()
        filteredServices.forEach((service: { service_category: unknown }) => {
          const category = service.service_category as Category | null | undefined
          if (category && !categoryMap.has(category.id)) {
            categoryMap.set(category.id, category)
          }
        })
        dynamicCategories = Array.from(categoryMap.values()).sort(
          (a, b) => a.sort_order - b.sort_order
        )
      }

      const { data: serviceClasses } = await supabase
        .from('service_class')
        .select('id, name, sort_order')
        .order('sort_order', { ascending: true })

      const { data: classIndexData } = await supabase
        .from('service_class_index')
        .select('service_class_id, service_category_id')

      if (serviceClasses && classIndexData) {
        const classIndexMap = new Map(
          classIndexData.map(ci => [ci.service_category_id, ci.service_class_id])
        )
        classGroups = groupCategoriesByClass(
          dynamicCategories,
          serviceClasses as ServiceClass[],
          classIndexMap
        )
        const overviewClass = serviceClasses.find(sc => sc.name === '概要')
        if (overviewClass) {
          overviewLabel = overviewClass.name
        }
      }
    }
  }

  const basePath =
    variant === 'saas'
      ? `${APP_ROUTES.SAAS.DASHBOARD}/subMenu`
      : variant === 'admin'
        ? `${APP_ROUTES.TENANT.ADMIN}/subMenu`
        : undefined
  const isSaaSAdmin = variant === 'saas' || variant === 'admin'

  return (
    <SidebarNav
      classGroups={classGroups}
      overviewLabel={overviewLabel}
      tenantName={tenantName}
      basePath={basePath}
      userName={variant !== 'portal' ? userName : undefined}
      isSaaSAdmin={isSaaSAdmin}
      appRole={user?.appRole}
      variant={variant}
    />
  )
}
