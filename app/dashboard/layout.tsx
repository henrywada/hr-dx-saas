import React from "react";
// サーバーサイドでの認証情報取得用
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// ★修正：実際のファイルの場所に合わせました
// app/dashboard/_components/dashboard-nav.tsx を読み込みます
import { DashboardNav } from "./_components/dashboard-nav";

import { Russo_One } from "next/font/google";
import Link from "next/link";

const logoFont = Russo_One({ weight: "400", subsets: ["latin"] });

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. サーバーサイドでユーザー情報を取得
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 2. ログインしていなければログイン画面へリダイレクト
  if (!user) {
    redirect("/login");
  }

  // 3. ユーザーのロールを取得
  let userRole = "";
  try {
    const { data: employee } = await supabase
      .from("employees")
      .select("app_role")
      .eq("id", user.id)
      .single();
    if (employee?.app_role) {
      userRole = employee.app_role;
    }
  } catch (error) {
    // ロール取得失敗時は通常ユーザー扱い（設定メニュー非表示など）
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* 1. ヘッダー */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center border-b bg-white px-6 shadow-sm relative">
        <div className="flex items-center">
          <Link href="/dashboard" className={`flex items-center gap-2 font-bold text-2xl ${logoFont.className}`}>
            <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
              HR-dx
            </span>
          </Link>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="text-lg font-bold text-gray-800">管理画面TOP</span>
        </div>
      </header>

      {/* 2. メインエリア */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左サイドバー */}
        <aside className="hidden w-64 flex-col border-r bg-gray-50/50 md:flex">
          <div className="flex-1 overflow-y-auto py-4">
            {/* ユーザーのメールアドレスとロールをメニューに渡す */}
            <DashboardNav className="px-4" email={user.email} role={userRole} />
          </div>
        </aside>

        {/* 右コンテンツ */}
        <main className="flex-1 overflow-y-auto bg-white p-6 md:p-8">
          <div className="mx-auto w-full max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}