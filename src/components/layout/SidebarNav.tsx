'use client'

import React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, ArrowLeft } from 'lucide-react'
import {
  SidebarCategoryLinkRow,
  SidebarDashboardLinkRow,
  SidebarPlainNavLink,
} from '@/components/layout/SidebarNavLinkRows'
import { APP_ROUTES } from '@/config/routes'
import { writeAuditLog } from '@/lib/log/actions'
import { useMobileMenu } from '@/components/layout/MobileMenuContext'

interface SidebarNavProps {
  classGroups: {
    id: string
    name: string
    categories: {
      id: string
      name: string
      sort_order: number
    }[]
  }[]
  overviewLabel: string
  isSaaSAdmin?: boolean
  basePath?: string
  userName?: string
  /** company_doctor の場合は「ポータルへ戻る」の代わりに「ログアウト」を表示 */
  appRole?: string
  variant?: 'portal' | 'admin' | 'saas'
}

export function SidebarNav({
  classGroups,
  overviewLabel,
  isSaaSAdmin = false,
  basePath = `${APP_ROUTES.TENANT.PORTAL}/subMenu`,
  userName,
  appRole,
  variant,
}: SidebarNavProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileMenu()

  const handleLogoutOrReturn = async () => {
    // company_doctor の場合は常にログアウト（ポータルへ戻るは不要）
    if (isSaaSAdmin && appRole !== 'company_doctor') {
      router.push(APP_ROUTES.TENANT.PORTAL)
    } else {
      await writeAuditLog({ action: 'LOGOUT', path: '/logout' }).catch(console.error)
      await supabase.auth.signOut()
      router.push(APP_ROUTES.AUTH.LOGIN)
      router.refresh()
    }
  }

  // company_doctor の場合は「ポータルへ戻る」の代わりに「ログアウト」を表示
  const showLogoutInsteadOfPortal = appRole === 'company_doctor'

  const dashboardHref = basePath.replace('/subMenu', '')
  // "/top/subMenu" -> "/top", "/adm/subMenu" -> "/adm", "/saas_adm/subMenu" -> "/saas_adm"

  const isActive = (path: string, categoryId?: string) => {
    // Logic for top (Dashboard)
    if (path === dashboardHref && pathname === dashboardHref) return true

    // Logic for subMenu using query params
    if (path.includes('subMenu') && categoryId) {
      return pathname === path && searchParams?.get('service_category_id') === categoryId
    }

    // Default prefix match for other paths (if any)
    if (path !== dashboardHref && !path.includes('subMenu') && pathname?.startsWith(path))
      return true

    return false
  }

  const navLinkBase =
    'flex items-center gap-3 px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 group relative'
  const navLinkInactive = 'text-[#24292f] hover:bg-[#f6f8fa]'
  const navLinkActive = 'bg-[#fff3e6] text-[#FD7601] border-l-2 border-[#FD7601]'

  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 min-w-64 shrink-0 bg-white border-r border-[#e2e6ec] flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl flex' : '-translate-x-full md:flex hidden'}`}
      >
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {/* Dynamic Business Menu & Logout */}
          <div>
            {/* Overview Group */}
            <div>
              <h3 className="text-[11px] font-medium text-[#57606a] mb-2 px-3">{overviewLabel}</h3>
              <nav className="space-y-0 pb-2 mb-2 border-b border-[#e2e6ec]">
                <SidebarDashboardLinkRow
                  href={dashboardHref}
                  isActive={isActive(dashboardHref)}
                  onNavigate={() => setIsMobileMenuOpen(false)}
                  linkClassName={`${navLinkBase} ${
                    isActive(dashboardHref) ? navLinkActive : navLinkInactive
                  }`}
                />
              </nav>
            </div>

            {/* Class Groups */}
            {classGroups.map(group => (
              <div key={group.id}>
                <h3 className="text-[11px] font-medium text-[#57606a] mb-2 px-3">{group.name}</h3>
                <nav className="space-y-0 pb-2 mb-2 border-b border-[#e2e6ec]">
                  {group.categories.map(category => {
                    const categoryPath = `${basePath}?service_category_id=${category.id}`
                    const active = isActive(basePath, category.id)

                    return (
                      <SidebarCategoryLinkRow
                        key={category.id}
                        href={categoryPath}
                        categoryName={category.name}
                        active={active}
                        onNavigate={() => setIsMobileMenuOpen(false)}
                        linkClassName={`${navLinkBase} ${active ? navLinkActive : navLinkInactive}`}
                      />
                    )
                  })}
                </nav>
              </div>
            ))}

            <nav className="space-y-0">
              {/* Logout / Return Button */}
              {isSaaSAdmin && !showLogoutInsteadOfPortal ? (
                <SidebarPlainNavLink
                  href={APP_ROUTES.TENANT.PORTAL}
                  icon={ArrowLeft}
                  label="ポータルへ戻る"
                  className={`w-full ${navLinkBase} ${navLinkInactive}`}
                />
              ) : (
                <button
                  onClick={handleLogoutOrReturn}
                  className={`w-full ${navLinkBase} ${navLinkInactive}`}
                >
                  <LogOut className="w-5 h-5 text-[#57606a] group-hover:text-[#24292f]" />
                  <span className="flex-1 text-left">ログアウト</span>
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* User / Bottom Actions */}
        <div className="p-4 border-t border-[#e2e6ec]">
          {userName && (
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-[#f6f8fa] flex items-center justify-center text-[#24292f] font-bold text-sm border border-[#e2e6ec]">
                {userName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-[#24292f] truncate">{userName}</p>
                <p className="text-[10px] text-[#57606a] truncate">ログイン中</p>
              </div>
            </div>
          )}
          <button className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-[#57606a] hover:text-[#24292f] hover:bg-[#f6f8fa] rounded-lg transition-colors">
            ヘルプ＆サポート
          </button>
        </div>
      </aside>
    </>
  )
}
