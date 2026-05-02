import React, { Suspense } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { RouteSegmentLoading } from '@/components/layout/RouteSegmentLoading'

export default function TenantColoredLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<RouteSegmentLoading />}>
      <AppLayout variant="admin">{children}</AppLayout>
    </Suspense>
  )
}
