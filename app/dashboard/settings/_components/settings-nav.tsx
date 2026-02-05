"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    Settings,
    Building2,
    UserPlus,
    Activity,
    Sparkles,
} from "lucide-react"

// 組織設定メニュー
const organizationItems = [
    {
        title: "基本設定",
        href: "/dashboard/settings",
        icon: Settings,
    },
    {
        title: "部署・組織構成",
        href: "/dashboard/settings/divisions",
        icon: Building2,
    },
    {
        title: "従業員登録",
        href: "/dashboard/settings/employees",
        icon: UserPlus,
    },
]

// パルスサーベイ設定メニュー
const pulseItems = [
    {
        title: "パルス診断テーマ選択",
        href: "/dashboard/settings/pulse/themes",
        icon: Sparkles,
    },
    {
        title: "パルスサーベイ頻度",
        href: "/dashboard/settings/basic",
        icon: Activity,
    },
]

export function SettingsNav() {
    const pathname = usePathname()

    const renderMenuItem = (item: { title: string; href: string; icon: React.ComponentType<{ className?: string }> }, index: number) => {
        const isActive = pathname === item.href

        return (
            <div key={index}>
                <Link
                    href={item.href}
                    className={cn(
                        "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",

                        isActive
                            ? "bg-orange-600 text-white shadow-md" // 選択中は濃いオレンジ
                            : "text-slate-600 hover:bg-orange-500 hover:text-white" // 未選択時はホバーで鮮やかなオレンジ
                    )}
                >
                    <item.icon
                        className={cn(
                            "mr-2 h-4 w-4 transition-colors",
                            isActive
                                ? "text-white"
                                : "text-slate-400 group-hover:text-white"
                        )}
                    />
                    <span>{item.title}</span>
                </Link>
            </div>
        )
    }

    return (
        <nav className="grid gap-1 px-2">
            {/* 組織設定メニュー */}
            {organizationItems.map((item, index) => renderMenuItem(item, index))}
            
            {/* 罫線 */}
            <div className="my-2 border-t border-gray-300" />
            
            {/* パルスサーベイ設定メニュー */}
            {pulseItems.map((item, index) => renderMenuItem(item, index + organizationItems.length))}
        </nav>
    )
}
