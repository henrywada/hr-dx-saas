'use client'

import React from 'react'
import Link from 'next/link'
import { LogOut, Settings, Shield, ArrowLeft, Menu, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth/context'
import { useMobileMenu } from '@/components/layout/MobileMenuContext'
import { APP_ROUTES } from '@/config/routes'
import { writeAuditLog } from '@/lib/log/actions'

interface AppHeaderProps {
  variant: 'portal' | 'admin' | 'saas'
  onMenuClick?: () => void
}

export function AppHeader({ variant }: AppHeaderProps) {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const { isMobileMenuOpen, toggleMobileMenu } = useMobileMenu()

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

        <Link href={APP_ROUTES.TENANT.PORTAL} className="flex items-center gap-2 group">
          <div
            className={`w-8 h-8 rounded-lg bg-linear-to-br from-[#FF6B00] to-orange-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300 ${variant !== 'portal' ? 'border border-white/20' : ''}`}
          >
            <span className="text-white font-bold text-lg tracking-tight">H</span>
          </div>
          <div
            className={`text-xl md:text-2xl font-bold tracking-tighter drop-shadow-sm select-none ${variant === 'portal' ? 'text-accent-orange' : 'text-white'}`}
            style={{
              textShadow:
                variant !== 'portal' ? '0 1px 2px rgba(0,0,0,0.2)' : '0 1px 1px rgba(0,0,0,0.05)',
            }}
          >
            HR-dx
          </div>
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
