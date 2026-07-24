import React, { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { RouteSegmentLoading } from '@/components/layout/RouteSegmentLoading'
import { SubMenuServiceCard } from '@/components/submenu/SubMenuServiceCard'
import { resolveServiceLinkHref } from '@/lib/service-route'

export default async function SubMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams
  const categoryId = resolvedSearchParams.service_category_id as string | undefined

  if (!categoryId) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-gray-500">
        <p>カテゴリーが選択されていません。</p>
        <p className="mt-2 text-sm">サイドメニューから項目を選択してください。</p>
      </div>
    )
  }

  return (
    <Suspense fallback={<RouteSegmentLoading embedded />}>
      <AdminSubMenuCategoryContent categoryId={categoryId} />
    </Suspense>
  )
}

async function AdminSubMenuCategoryContent({ categoryId }: { categoryId: string }) {
  const supabase = await createClient()
  const user = await getServerUser()
  const tenantId = user?.tenant_id

  const { data: category } = await supabase
    .from('service_category')
    .select('name')
    .eq('id', categoryId)
    .single()

  let tenantServiceIds: string[] = []
  if (tenantId) {
    const { data: tenantServices } = await supabase
      .from('tenant_service')
      .select('service_id')
      .eq('tenant_id', tenantId)
    tenantServiceIds = (tenantServices?.map(ts => ts.service_id).filter(Boolean) as string[]) ?? []
  }

  let services = null
  if (tenantServiceIds.length > 0) {
    const { data } = await supabase
      .from('service')
      .select('*')
      .eq('service_category_id', categoryId)
      .eq('release_status', '公開')
      .eq('target_audience', 'adm')
      .in('id', tenantServiceIds)
      .order('sort_order', { ascending: true })
    services = data

    if (services && services.length > 0) {
      const serviceIds = services.map((s: { id: string }) => s.id)
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

      services = services.filter((s: { id: string }) => {
        const restrictedRoles = serviceToRoles.get(s.id)
        if (!restrictedRoles || restrictedRoles.size === 0) return true
        return userAppRoleId != null && restrictedRoles.has(userAppRoleId)
      })
    }
  }

  const CARD_VARIANTS = [
    { bar: 'bg-blue-500', text: 'text-blue-600', hover: 'group-hover:text-blue-700' },
    { bar: 'bg-teal-400', text: 'text-teal-600', hover: 'group-hover:text-teal-700' },
    { bar: 'bg-orange-500', text: 'text-orange-600', hover: 'group-hover:text-orange-700' },
    { bar: 'bg-indigo-500', text: 'text-indigo-600', hover: 'group-hover:text-indigo-700' },
    { bar: 'bg-pink-500', text: 'text-pink-600', hover: 'group-hover:text-pink-700' },
    { bar: 'bg-green-500', text: 'text-green-600', hover: 'group-hover:text-green-700' },
  ]

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-blue-700">{category?.name || '未設定のカテゴリ'}</h1>
        <p className="mt-1 text-sm text-gray-500">関連する業務アプリケーション一覧</p>
      </div>

      {!services || services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <p className="text-gray-500">利用可能なサービスがありません。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {services.map((service, index) => {
            const variant = CARD_VARIANTS[index % CARD_VARIANTS.length]
            let targetPath = service.route_path || '#'
            if (targetPath !== '#') {
              if (!targetPath.startsWith('/')) {
                targetPath = '/' + targetPath
              }
              if (!targetPath.startsWith('/adm/') && !targetPath.startsWith('/device-pairing')) {
                targetPath = '/adm' + targetPath
              }
            }
            targetPath = resolveServiceLinkHref(targetPath)

            return (
              <SubMenuServiceCard
                key={service.id}
                href={targetPath}
                variant={variant}
                layout="admin"
                title={service.title}
                name={service.name}
                description={service.description}
                serviceName={service.name}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
