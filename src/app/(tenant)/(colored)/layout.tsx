import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";

export default function TenantColoredLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout variant="admin">{children}</AppLayout>;
}