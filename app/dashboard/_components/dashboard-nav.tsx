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

// 許可されるロール定義
const SETTINGS_ALLOWED_ROLES = ["hr_manager", "hr", "developer", "test"];

// メニュー項目のデータ
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
        allowedRoles: SETTINGS_ALLOWED_ROLES, // ★ロール制限を追加
    },
    // ★重要：管理者メニュー
    {
        title: "【SaaS開発者用】",
        href: "/developer/companies",
        icon: ShieldAlert, 
        separator: true,
        adminOnly: true, 
    },
    {
        title: "ポータルへ戻る",
        href: "/portal",
        icon: ArrowLeftCircle,
        separator: true,
    },
];

// 型定義に email と role を追加
interface DashboardNavProps {
    className?: string;
    setOpen?: (open: boolean) => void;
    email?: string;
    role?: string; // ★追加
}

// 管理者のメールアドレス（layout.tsxと同じものにする）
const ALLOWED_ADMIN_EMAIL = "wada007@gmail.com";

export function DashboardNav({ className, setOpen, email, role }: DashboardNavProps) {
    const pathname = usePathname();

    // ★フィルタリング処理
    const filteredItems = items.filter((item) => {
        // 1. 管理者限定メニューのチェック
        // @ts-ignore
        if (item.adminOnly) {
            return email === ALLOWED_ADMIN_EMAIL;
        }

        // 2. ロール制限のあるメニューのチェック
        // @ts-ignore
        if (item.allowedRoles) {
            // roleが無い、または許可リストに含まれていない場合は非表示
            // @ts-ignore
            if (!role || !item.allowedRoles.includes(role)) {
                return false;
            }
        }

        return true;
    });

    if (!filteredItems?.length) {
        return null;
    }

    return (
        <nav className={cn("grid items-start gap-1 py-2", className)}>
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