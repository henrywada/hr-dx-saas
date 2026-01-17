"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    Activity,
    GraduationCap,
    Zap,
    Headphones,
    Settings,
    ArrowLeftCircle,
    ShieldAlert, // アイコン追加推奨
} from "lucide-react";

// メニュー項目のデータ（ここはそのまま）
const items = [
    {
        title: "Home",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "人事・採用支援",
        href: "/dashboard/team-building",
        icon: Users,
    },
    {
        title: "組織の健康度測定・早期対応",
        href: "/dashboard/well-being",
        icon: Activity,
    },
    {
        title: "人材育成・リスキリング",
        href: "/dashboard/reskilling",
        icon: GraduationCap,
    },
    {
        title: "業務自動化・生産性向上",
        href: "/dashboard/automation",
        icon: Zap,
    },
    {
        title: "顧客対応・営業支援",
        href: "/dashboard/support",
        icon: Headphones,
    },
    {
        title: "設定（Settings）",
        href: "/dashboard/settings",
        icon: Settings,
    },
    // ★重要：管理者メニュー
    {
        title: "【SaaS開発者用】",
        href: "/developer/companies",
        icon: ShieldAlert, // Zapから変更すると分かりやすいです
        separator: true,
        adminOnly: true, // ★目印（フラグ）をつけます
    },
    {
        title: "ポータルへ戻る",
        href: "/portal",
        icon: ArrowLeftCircle,
        separator: true,
    },
];

// 型定義に email を追加
interface DashboardNavProps {
    className?: string;
    setOpen?: (open: boolean) => void;
    email?: string; // ★追加
}

// 管理者のメールアドレス（layout.tsxと同じものにする）
const ALLOWED_ADMIN_EMAIL = "wada007@gmail.com";

export function DashboardNav({ className, setOpen, email }: DashboardNavProps) {
    const pathname = usePathname();

    // ★フィルタリング処理：管理者以外なら adminOnly の項目を除外
    const filteredItems = items.filter((item) => {
        // @ts-ignore (adminOnlyプロパティが型定義にないので一時的に無視、またはanyにする)
        if (item.adminOnly) {
            return email === ALLOWED_ADMIN_EMAIL;
        }
        return true;
    });

    if (!filteredItems?.length) {
        return null;
    }

    return (
        <nav className={cn("grid items-start gap-1 py-2", className)}>
            {/* ★ items.map ではなく filteredItems.map を使う */}
            {filteredItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                    <div key={index} className="w-full">
                        {/* @ts-ignore */}
                        {item.separator && (
                            <div className="my-2 border-t border-gray-200" />
                        )}
                        <Link
                            href={item.href}
                            onClick={() => {
                                if (setOpen) setOpen(false);
                            }}
                        >
                            <span
                                className={cn(
                                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                                    isActive ? "bg-accent text-accent-foreground" : "transparent",
                                    // 管理者メニューだけ赤文字にする等の装飾も可能です
                                    // @ts-ignore
                                    item.adminOnly ? "text-red-600 hover:text-red-700" : ""
                                )}
                            >
                                <Icon className="mr-2 h-4 w-4" />
                                <span>{item.title}</span>
                            </span>
                        </Link>
                    </div>
                );
            })}
        </nav>
    );
}