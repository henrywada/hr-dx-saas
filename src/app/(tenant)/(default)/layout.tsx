import React, { Suspense } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { RouteSegmentLoading } from '@/components/layout/RouteSegmentLoading'

export default function TenantDefaultLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<RouteSegmentLoading />}>
      <AppLayout variant="portal">{children}</AppLayout>
    </Suspense>
  )
}
