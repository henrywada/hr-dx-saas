import React from "react";
// サーバーサイドでの認証情報取得用
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// app/dashboard/_components/dashboard-nav.tsx を読み込みます
import { DashboardNav } from "./_components/dashboard-nav";
import { getDashboardMenuData } from "@/utils/dashboard-actions";

import { Russo_One } from "next/font/google";
import Link from "next/link";
import { VersionFooter } from "@/components/version-footer";

const logoFont = Russo_One({ weight: "400", subsets: ["latin"] });

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. メニューデータ、ロール、SaaS管理者フラグを取得
  const { menuItems, role, isSaaSAdmin } = await getDashboardMenuData();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Header Context Definitions
  const headerContext = isSaaSAdmin
    ? {
        title: "SaaS管理画面",
        bgColor: "bg-gradient-to-b from-gray-800 to-black",
        borderColor: "border-gray-800",
        textColor: "text-white",
      }
    : {
        title: "管理画面",
        bgColor: "bg-gradient-to-b from-green-500 to-green-700",
        borderColor: "border-green-800",
        textColor: "text-white",
      };

  return (
    <div className="flex min-h-screen flex-col relative">
      {/* 1. ヘッダー (Dynamic Style) */}
      <header
        className={`sticky top-0 z-50 flex h-16 w-full items-center border-b px-6 shadow-2xl relative transition-colors ${headerContext.bgColor} ${headerContext.borderColor}`}
      >
        <div className="flex items-center">
          <Link
            href="/portal"
            className={`flex items-center gap-2 font-bold text-2xl ${logoFont.className}`}
          >
            <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
              HR-dx
            </span>
          </Link>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className={`text-lg font-bold ${headerContext.textColor}`}>
            {headerContext.title}
          </span>
        </div>
      </header>

      {/* 3D Shadow Line Effect */}
      <div className="absolute top-16 left-0 w-full h-4 bg-gradient-to-b from-black/20 to-transparent z-40 pointer-events-none" />

      {/* 2. メインエリア */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左サイドバー */}
        <aside className="hidden w-64 flex-col border-r bg-gray-50/50 md:flex">
          <div className="flex-1 overflow-y-auto py-4">
            {/* Dynamic Menu Items */}
            <DashboardNav
              className="px-4"
              items={menuItems}
              email={user.email}
              role={role || ""}
            />
          </div>
        </aside>

        {/* 右コンテンツ */}
        <main className="flex-1 overflow-y-auto bg-white p-6 md:p-8">
          <div className="mx-auto w-full max-w-full">
            {children}
            <div className="mt-8">
                <VersionFooter />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}