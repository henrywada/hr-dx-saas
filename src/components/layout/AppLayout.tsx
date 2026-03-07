import React from "react";
import { getServerUser } from "@/lib/auth/server-user";
import { AuthProvider } from "@/lib/auth/context";
import { TenantProvider } from "@/lib/tenant/context";
import { MobileMenuProvider } from "@/components/layout/MobileMenuContext";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Footer } from "@/components/layout/Footer";

interface AppLayoutProps {
  children: React.ReactNode;
  variant: 'portal' | 'admin' | 'saas';
}

export async function AppLayout({ children, variant }: AppLayoutProps) {
  const user = await getServerUser();

  let bgStyle = { backgroundColor: "#F9FAFB" };
  if (variant === 'admin' || variant === 'saas') {
    bgStyle = { backgroundColor: "#E5EBFF" };
  }

  return (
    <AuthProvider user={user}>
      <TenantProvider tenantId={user?.tenant_id} tenantName={user?.tenant_name}>
        <MobileMenuProvider>
          <div className="flex flex-col h-screen font-sans text-slate-900 overflow-hidden" style={bgStyle}>
            <AppHeader variant={variant} />
            <div className="flex flex-1 overflow-hidden" style={bgStyle}>
              <AppSidebar variant={variant} />
              <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative" style={bgStyle}>
                <div className="flex-1 overflow-y-auto scroll-smooth">
                  <div className={`p-4 sm:p-6 md:p-8 w-full mx-auto ${(variant === 'saas' || variant === 'admin') ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
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
  );
}
