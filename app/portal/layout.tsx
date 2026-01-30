import React from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Russo_One } from "next/font/google";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/auth/actions";
import { PortalSidebar } from "./_components/portal-sidebar";
import { getPortalMenuData } from "@/utils/portal-actions";
import { VersionFooter } from "@/components/version-footer";
import { MobileNav } from "./_components/mobile-nav";
import { setDashboardMode } from "@/utils/dashboard-actions"; // Import added

const logoFont = Russo_One({ weight: "400", subsets: ["latin"] });

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // 2. Fetch Employee Info for Header logic
  const { data: employee } = await supabase
    .from("employees")
    .select("app_role")
    .eq("id", user.id)
    .single();

  const canAccessDashboard = employee && employee.app_role !== "employee";

  // 3. Fetch Menu Data
  const categories = await getPortalMenuData();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center border-b bg-white px-6 shadow-sm relative">

          <div className="flex items-center gap-4 md:gap-8">
            <MobileNav categories={categories} />
            <Link href="/portal" className="flex items-center gap-2">
              <span
                className={`${logoFont.className} text-xl md:text-2xl bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent drop-shadow-sm`}
              >
                HR-dx
              </span>
            </Link>
            {/* 
            <span className="text-sm font-medium text-gray-500 hidden md:inline-block border-l pl-4">
              人事DX ポータル
            </span>
            */}
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
             <span className="text-lg font-bold text-gray-800">人事DX ポータル</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <form action={logout}>
              <Button variant="outline" size="sm" className="gap-2 h-9">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">ログアウト</span>
              </Button>
            </form>

            {/* Company Admin Dashboard */}
            {canAccessDashboard && (
              <form action={async () => {
                "use server";
                await setDashboardMode("company");
              }}>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 h-9 bg-gray-900 hover:bg-gray-800 text-white"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">管理画面へ</span>
                </Button>
              </form>
            )}

            {/* SaaS Admin Dashboard (Developer & SaaS Adm Only) */}
            {(employee?.app_role === "developer" || employee?.app_role === "saas_adm") && (
              <form action={async () => {
                "use server";
                await setDashboardMode("saas");
              }}>
                <Button
                  variant="destructive" // Use red/destructive variant for SaaS admin to stand out
                  size="sm"
                  className="gap-2 h-9"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">SaaS管理画面へ</span>
                </Button>
              </form>
            )}

            <Button asChild variant="ghost" size="sm" className="gap-2 h-9">
              <Link href="/portal/settings">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">設定</span>
              </Link>
            </Button>
          </div>
      </header>

      {/* Main Layout Area - Full Width Flex */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col border-r bg-gray-50/50 md:flex">
           <div className="flex-1 overflow-y-auto py-4 px-4">
             {/* Removed "Menu" title as it's not in dashboard sidebar usually, adding padding to match */}
             <PortalSidebar categories={categories} />
           </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-white px-8 md:px-12 pb-8 md:pb-12 pt-2 md:pt-4">
           <div className="mx-auto w-full max-w-6xl">
             {children}
             <div className="mt-10">
                <VersionFooter />
             </div>
           </div>
        </main>
      </div>
    </div>
  );
}
