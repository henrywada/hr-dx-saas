'use client'

import React from 'react'
import Link from 'next/link'
import { LogOut, Settings, Shield, ArrowLeft, Menu, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/context'
import { useTenant } from '@/lib/tenant/context'
import { useMobileMenu } from '@/components/layout/MobileMenuContext'
import { APP_ROUTES } from '@/config/routes'
import { writeAuditLog } from '@/lib/log/actions'

interface AppHeaderProps {
  variant: 'portal' | 'admin' | 'saas'
  onMenuClick?: () => void
}

export function AppHeader({ variant }: AppHeaderProps) {
  const { user } = useAuth()
  const { tenantName: tenantNameFromContext } = useTenant()
  const router = useRouter()
  const supabase = createClient()
  const { isMobileMenuOpen, toggleMobileMenu } = useMobileMenu()

  // tenants.name（サーバー側 getServerUser / TenantProvider 経由）
  const tenantBrandName =
    [tenantNameFromContext, user?.tenant_name]
      .find(s => typeof s === 'string' && s.trim().length > 0)
      ?.trim() ??
    (variant === 'saas' ? 'プラットフォーム運営' : 'ワークスペース')

  const homeHref =
    variant === 'saas'
      ? APP_ROUTES.SAAS.DASHBOARD
      : variant === 'admin'
        ? APP_ROUTES.TENANT.ADMIN
        : APP_ROUTES.TENANT.PORTAL

  const handleLogout = async () => {
    await writeAuditLog({ action: 'LOGOUT', path: '/logout' }).catch(console.error)
    await supabase.auth.signOut()
    router.push(APP_ROUTES.AUTH.LOGIN)
    router.refresh()
  }

  const userName = user?.name || 'Guest User'
  const role = user?.role || 'member'
  const appRole = user?.appRole

  let bgStyle = 'rgba(255, 255, 255, 0.95)'

  if (variant === 'admin') {
    bgStyle = 'linear-gradient(180deg, #008AA3 0%, #00738A 40%, #005F71 100%)'
  } else if (variant === 'saas') {
    bgStyle = '#000B00'
  }

  const headerStyle = {
    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.2)',
    zIndex: 50,
    background: bgStyle,
  }

  return (
    <header
      style={headerStyle}
      className={`h-16 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 rounded-b-2xl transition-all duration-300 border-b ${variant === 'portal' ? 'border-slate-100/50' : 'border-white/10'} backdrop-blur-md`}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={toggleMobileMenu}
          className={`md:hidden p-2 rounded-md ${variant === 'portal' ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-white/10 text-white'}`}
          aria-label="メニューを開く"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <Link
          href={homeHref}
          title={tenantBrandName}
          className="group flex min-w-0 max-w-[min(100%,22rem)] items-center gap-3"
        >
          {/* ミニマルな縦線アクセント（旧ロゴ枠の代わりに余白とリズムを確保） */}
          <span
            className={`hidden h-8 w-px shrink-0 sm:block ${
              variant === 'portal' ? 'bg-primary/35' : 'bg-white/35'
            }`}
            aria-hidden
          />
          <span
            className={`min-w-0 truncate text-[0.9375rem] font-bold leading-snug tracking-[0.05em] select-none md:text-[1.0625rem] ${
              variant === 'portal' ? 'text-slate-800' : 'text-white'
            }`}
            style={{
              fontFamily:
                "'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'Yu Mincho', 'Noto Serif JP', serif",
              fontFeatureSettings: '"palt", "kern"',
              textShadow:
                variant !== 'portal' ? '0 1px 2px rgba(0,0,0,0.25)' : '0 1px 2px rgba(255,255,255,0.8)',
              letterSpacing: '0.05em',
            }}
          >
            {tenantBrandName}
          </span>
        </Link>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3 md:gap-4">
        <div
          className={`h-6 w-px ${variant === 'portal' ? 'bg-slate-200' : 'bg-white/20'} mx-1 hidden md:block`}
        ></div>

        <div
          className={`flex items-center gap-1 mr-2 border-r ${variant === 'portal' ? 'border-slate-200' : 'border-white/20'} pr-2 md:pr-4`}
        >
          {variant === 'portal' ? (
            <>
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-accent-orange hover:bg-orange-50 rounded-md transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>ログアウト</span>
              </button>

              <div className="flex items-center gap-1 md:gap-3">
                {appRole && appRole !== 'employee' && (
                  <Link href={APP_ROUTES.TENANT.ADMIN}>
                    <button
                      className="flex items-center gap-2 px-3 py-1.5 md:py-2 text-sm font-bold text-accent-orange bg-orange-50/80 border border-orange-200 hover:bg-orange-100 hover:border-orange-300 rounded-md transition-all shadow-sm"
                      title="管理へ"
                    >
                      <Settings className="w-5 h-5 md:w-4 md:h-4" />
                      <span className="hidden md:inline">管理へ</span>
                    </button>
                  </Link>
                )}

                {(appRole === 'developer' || role === 'supaUser') && (
                  <Link href={APP_ROUTES.SAAS.DASHBOARD}>
                    <button
                      className="flex items-center gap-2 px-3 py-1.5 md:py-2 text-sm font-bold text-blue-700 bg-blue-50/80 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 rounded-md transition-all shadow-sm"
                      title="SaaS管理へ"
                    >
                      <Shield className="w-5 h-5 md:w-4 md:h-4" />
                      <span className="hidden md:inline">SaaS管理へ</span>
                    </button>
                  </Link>
                )}
              </div>
            </>
          ) : appRole === 'company_doctor' ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-white/10 rounded-md transition-all text-white hover:text-white/90"
            >
              <LogOut className="w-4 h-4" />
              <span>ログアウト</span>
            </button>
          ) : (
            <Link
              href={APP_ROUTES.TENANT.PORTAL}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-white/10 rounded-md transition-all text-white hover:text-white/90`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ポータルへ戻る</span>
            </Link>
          )}
        </div>

        {/* Back Button */}
        <button
          onClick={() => router.push(APP_ROUTES.TENANT.PORTAL)}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-all hover:opacity-80 ${
            variant === 'portal'
              ? 'text-slate-600 hover:bg-slate-100'
              : 'text-white hover:bg-white/10'
          }`}
          title="ポータルへ戻る"
        >
          戻る
        </button>
      </div>
    </header>
  )
}
