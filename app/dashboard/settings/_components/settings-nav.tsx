"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    Settings,
    Building2,
    UserPlus,
} from "lucide-react"

const items = [
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

export function SettingsNav() {
    const pathname = usePathname()

    return (
        <nav className="grid gap-1 px-2">
            {items.map((item, index) => {
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
            })}
        </nav>
    )
}
