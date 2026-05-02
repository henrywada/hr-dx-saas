import React from 'react'
import { AppLayout } from '@/components/layout/AppLayout'

export default function TenantDefaultLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout variant="portal">{children}</AppLayout>
}
