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
  dynamicCategories: {
    id: string
    name: string
    sort_order: number
  }[]
  tenantName?: string
  isSaaSAdmin?: boolean
  basePath?: string
  userName?: string
  /** company_doctor の場合は「ポータルへ戻る」の代わりに「ログアウト」を表示 */
  appRole?: string
}

export function SidebarNav({
  dynamicCategories,
  tenantName,
  isSaaSAdmin = false,
  basePath = `${APP_ROUTES.TENANT.PORTAL}/subMenu`,
  userName,
  appRole,
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
    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative'
  const navLinkInactive = 'text-slate-300 hover:bg-white/10 hover:text-white'
  const navLinkActive =
    'bg-white/10 text-accent-orange shadow-sm border border-white/10'

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
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 min-w-64 shrink-0 border-r border-slate-800 flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl flex' : '-translate-x-full md:flex hidden'}`}
        style={{ backgroundColor: '#0f1117' }}
      >
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          {/* Main Navigation */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">
              メインメニュー
            </h3>
            <nav className="space-y-1">
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

          {/* Dynamic Business Menu & Logout */}
          <div>
            <nav className="space-y-1">
              {dynamicCategories.length > 0 &&
                dynamicCategories.map(category => {
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
                  <LogOut className="w-5 h-5 text-slate-400 group-hover:text-slate-200" />
                  <span className="flex-1 text-left">ログアウト</span>
                </button>
              )}

              {/* Login Tenant Display */}
              {tenantName && (
                <div className="mt-6 pt-4 border-t border-slate-700 px-2">
                  <p className="text-xs font-semibold text-slate-400 truncate">{tenantName}</p>
                </div>
              )}
            </nav>
          </div>
        </div>

        {/* User / Bottom Actions */}
        <div className="p-4 border-t border-slate-800">
          {userName && (
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 font-bold text-sm border border-slate-600">
                {userName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-slate-200 truncate">{userName}</p>
                <p className="text-[10px] text-slate-500 truncate">ログイン中</p>
              </div>
            </div>
          )}
          <button className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/10 rounded-lg transition-colors">
            ヘルプ＆サポート
          </button>
        </div>
      </aside>
    </>
  )
}
