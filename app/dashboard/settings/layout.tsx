import { Metadata } from "next";
import { SettingsNav } from "./_components/settings-nav";

export const metadata: Metadata = {
    title: "設定",
    description: "アカウントと組織の設定を管理します。",
};

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // Paddingを削除し、親コンテナのパディングに任せる
        <div className="space-y-2 pb-16 block">
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">設定</h2>
                <p className="text-muted-foreground">
                    アカウントと組織の設定を管理します。
                </p>
            </div>

            {/* 上下の余白を詰める */}
            <div className="border-b my-2" />

            {/* 左右の余白(gap)を詰める */}
            <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
                <aside className="w-full md:w-56 shrink-0">
                    <SettingsNav />
                </aside>
                <div className="flex-1 w-full min-w-0">
                    {children}
                </div>
            </div>
        </div>
    );
}
