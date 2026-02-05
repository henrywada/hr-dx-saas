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
