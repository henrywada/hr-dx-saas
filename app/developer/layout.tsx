import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { AdminNav } from "./_components/admin-nav"; // ★作成したメニューをインポート

// あなたのメールアドレス
const ALLOWED_ADMIN_EMAIL = "wada007@gmail.com";

export default async function DeveloperLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    // 1. ログインユーザー情報を取得
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // 2. セキュリティチェック
    if (user.email !== ALLOWED_ADMIN_EMAIL) {
        console.warn(`Unauthorized access attempt to /developer by: ${user.email}`);
        return notFound();
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* 1. 最上部：セキュリティ警告バー */}
            <div className="bg-slate-900 text-white px-4 py-2 text-xs font-mono flex justify-between items-center shadow-md z-50">
                <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    SAAS_ADMIN_CONSOLE: CONNECTED
                </span>
                <span>USER: {user.email}</span>
            </div>

            {/* 2. 下部：サイドバー ＋ メインエリア */}
            <div className="flex flex-1 overflow-hidden">

                {/* 左サイドバー */}
                <aside className="hidden w-64 flex-col border-r bg-white md:flex">
                    <div className="flex-1 overflow-y-auto">
                        <AdminNav />
                    </div>
                </aside>

                {/* 右メインコンテンツ */}
                <main className="flex-1 overflow-y-auto p-8">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>

            </div>
        </div>
    );
}