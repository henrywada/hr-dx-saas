import React from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'

export default async function TenantColoredLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser()

  // Role Guard: 一般従業員（employee）は管理画面に入れない
  if (!user || user.appRole === 'employee') {
    redirect(APP_ROUTES.TENANT.PORTAL)
  }

  return <AppLayout variant="admin">{children}</AppLayout>
}
