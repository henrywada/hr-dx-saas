import {
    Activity,
    ArrowLeftCircle,
    Blocks,
    Building2,
    GraduationCap,
    PlusCircle,
    Users,
    Zap,
} from "lucide-react";

export interface MenuItem {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

export interface MenuCategory {
    id: string;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    children: MenuItem[];
}

export const menuCategories: MenuCategory[] = [
    {
        id: "companies",
        title: "基本設定",
        icon: Building2,
        children: [
            {
                title: "全契約企業一覧",
                href: "/developer/companies",
                icon: Building2,
            },
            {
                title: "契約企業の登録",
                href: "/developer/companies/add",
                icon: PlusCircle,
            },
            {
                title: "サービスの登録",
                href: "/developer/services",
                icon: Blocks,
            },
        ],
    },
    {
        id: "hr-support",
        title: "人事・採用支援",
        icon: Users,
        children: [
            {
                title: "人事・採用支援",
                href: "/developer/hr-support",
                icon: Users,
            },
        ],
    },
    {
        id: "well-being",
        title: "組織の健康度測定・早期対応",
        icon: Activity,
        children: [
            {
                title: "組織の健康度測定・早期対応",
                href: "/developer/well-being",
                icon: Activity,
            },
        ],
    },
    {
        id: "reskilling",
        title: "人材育成・リスキリング",
        icon: GraduationCap,
        children: [
            {
                title: "人材育成・リスキリング",
                href: "/developer/reskilling",
                icon: GraduationCap,
            },
        ],
    },
    {
        id: "automation",
        title: "業務自動化・生産性支援",
        icon: Zap,
        children: [
            {
                title: "業務自動化・生産性支援",
                href: "/developer/automation",
                icon: Zap,
            },
        ],
    },
];

// 現在のパスからアクティブカテゴリーを判定
export function getActiveCategoryFromPath(pathname: string): string {
    if (pathname.startsWith("/developer/companies")) return "companies";
    if (pathname.startsWith("/developer/services")) return "companies";
    if (pathname.startsWith("/developer/hr-support")) return "hr-support";
    if (pathname.startsWith("/developer/well-being")) return "well-being";
    if (pathname.startsWith("/developer/reskilling")) return "reskilling";
    if (pathname.startsWith("/developer/automation")) return "automation";
    return "companies"; // デフォルト
}
