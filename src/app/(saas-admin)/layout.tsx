import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { getServerUser } from "@/lib/auth/server-user";
import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/config/routes";

export default async function SaasAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();

  // Role Guard: SaaS admin and Developer application role only
  if (!user || (user.role !== 'supaUser' && user.appRole !== 'developer')) {
    redirect(APP_ROUTES.TENANT.PORTAL);
  }

  return <AppLayout variant="saas">{children}</AppLayout>;
}