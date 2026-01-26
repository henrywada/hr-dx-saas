"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ArrowLeftCircle, ChevronDown, ChevronRight } from "lucide-react"
import { menuCategories, getActiveCategoryFromPath } from "./menu-config"

export function AdminNav() {
    const pathname = usePathname()
    const [activeCategory, setActiveCategory] = useState(() => 
        getActiveCategoryFromPath(pathname)
    )

    // パス変更時にアクティブカテゴリーを自動更新
    useEffect(() => {
        setActiveCategory(getActiveCategoryFromPath(pathname))
    }, [pathname])

    return (
        <nav className="grid items-start gap-1 p-4">
            <div className="mb-4 px-2 text-xs font-semibold uppercase text-muted-foreground">
                SaaS Console
            </div>

            {/* 親カテゴリーとサブメニューを統合 */}
            <div className="space-y-1">
                {menuCategories.map((category) => {
                    const isActive = category.id === activeCategory
                    const Icon = category.icon
                    
                    return (
                        <div key={category.id}>
                            {/* 親カテゴリーボタン */}
                            <button
                                onClick={() => setActiveCategory(category.id)}
                                className={cn(
                                    "w-full text-left px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200 flex items-center justify-between",
                                    isActive
                                        ? "bg-slate-200 text-slate-900"
                                        : "text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                <div className="flex items-center">
                                    <Icon className="mr-2 h-4 w-4" />
                                    {category.title}
                                </div>
                                {isActive ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </button>

                            {/* サブメニュー（選択されているカテゴリーのみ表示） */}
                            {isActive && (
                                <div className="ml-4 mt-1 space-y-1">
                                    {category.children.map((item) => {
                                        const isItemActive = pathname === item.href
                                        const ItemIcon = item.icon
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={cn(
                                                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                                    isItemActive 
                                                        ? "bg-slate-300 text-slate-900 font-semibold" 
                                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                )}
                                            >
                                                <ItemIcon className="mr-2 h-4 w-4" />
                                                <span>{item.title}</span>
                                            </Link>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* 管理画面TOPへ戻るリンク */}
            <div className="my-2 border-t border-gray-200" />
            <Link
                href="/dashboard"
                className="group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100 hover:text-slate-900 transition-colors text-slate-600"
            >
                <ArrowLeftCircle className="mr-2 h-4 w-4" />
                <span>管理画面TOPへ戻る</span>
            </Link>
        </nav>
    )
}