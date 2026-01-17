"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    Building2,
    PlusCircle,
    Users,
    Activity,
    GraduationCap,
    Zap,
    ArrowLeftCircle,
} from "lucide-react";

const items = [
    {
        title: "全契約企業一覧",
        href: "/developer/companies",
        icon: Building2,
    },
    {
        // ★修正箇所: リンク先を /developer/companies/add に変更
        title: "契約企業の登録",
        href: "/developer/companies/add",
        icon: PlusCircle,
    },
    {
        title: "人事・採用支援",
        href: "/developer/hr-support",
        icon: Users,
    },
    {
        title: "組織の健康度測定・早期対応",
        href: "/developer/well-being",
        icon: Activity,
    },
    {
        title: "人材育成・リスキリング",
        href: "/developer/reskilling",
        icon: GraduationCap,
    },
    {
        title: "業務自動化・生産性支援",
        href: "/developer/automation",
        icon: Zap,
    },
    {
        title: "管理画面TOPへ戻る",
        href: "/dashboard",
        icon: ArrowLeftCircle,
        separator: true, // 区切り線用フラグ
    },
];

export function AdminNav() {
    const pathname = usePathname();

    return (
        <nav className="grid items-start gap-1 p-4">
            <div className="mb-4 px-2 text-xs font-semibold uppercase text-muted-foreground">
                SaaS Console
            </div>

            {items.map((item, index) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                    <div key={index}>
                        {item.separator && (
                            <div className="my-2 border-t border-gray-200" />
                        )}
                        <Link
                            href={item.href}
                            className={cn(
                                "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100 hover:text-slate-900 transition-colors",
                                isActive ? "bg-slate-200 text-slate-900" : "text-slate-600"
                            )}
                        >
                            <Icon className="mr-2 h-4 w-4" />
                            <span>{item.title}</span>
                        </Link>
                    </div>
                );
            })}
        </nav>
    );
}