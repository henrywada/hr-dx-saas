import React from 'react'
import { getServerUser } from '@/lib/auth/server-user'
import { AuthProvider } from '@/lib/auth/context'
import { TenantProvider } from '@/lib/tenant/context'
import { MobileMenuProvider } from '@/components/layout/MobileMenuContext'
import { AppHeader } from '@/components/layout/AppHeader'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { Footer } from '@/components/layout/Footer'

interface AppLayoutProps {
  children: React.ReactNode
  variant: 'portal' | 'admin' | 'saas'
}

export async function AppLayout({ children, variant }: AppLayoutProps) {
  const user = await getServerUser()

  let bgStyle = { backgroundColor: '#F9FAFB' }
  let mainBgStyle = { backgroundColor: '#f5f6fa' }
  if (variant === 'admin') {
    // HR-DX Design System: page surface（#f6f8fa）
    bgStyle = { backgroundColor: '#f6f8fa' }
    mainBgStyle = { backgroundColor: '#f6f8fa' }
  } else if (variant === 'saas') {
    bgStyle = { backgroundColor: '#f2f8f8' }
  }

  return (
    <AuthProvider user={user}>
      <TenantProvider tenantId={user?.tenant_id} tenantName={user?.tenant_name}>
        <MobileMenuProvider>
          <div
            className="flex flex-col h-screen font-sans text-slate-900 overflow-hidden"
            style={bgStyle}
          >
            <AppHeader variant={variant} />
            <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden" style={bgStyle}>
              <AppSidebar variant={variant} />
              <main
                className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                style={mainBgStyle}
              >
                {/* flex-1 + min-h-0 で子の flex-1 / h-full が効く（チャット全画面用） */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-[1920px] flex-1 flex-col overflow-y-auto overflow-x-auto px-[24px] py-6 scroll-smooth">
                    {children}
                  </div>
                </div>
                <Footer />
              </main>
            </div>
          </div>
        </MobileMenuProvider>
      </TenantProvider>
    </AuthProvider>
  )
}
