import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Home,
    Users,
    Workflow,
    Settings,
    Briefcase,
    ArrowLeft,
    UserPlus,
    Heart,
    GraduationCap,
    Bot,
    Headset,
    Megaphone,
    TrendingUp,
    Coins,
    Zap,
    ShieldCheck,
    LucideIcon,
} from "lucide-react";

interface DashboardNavProps {
    className?: string;
    onLinkClick?: () => void;
}

interface NavItem {
    title: string;
    url: string;
    icon: LucideIcon;
}

export function DashboardNav({ className, onLinkClick }: DashboardNavProps) {
    const navItems: NavItem[] = [
        {
            title: "Home",
            url: "/dashboard",
            icon: Home,
        },
        {
            title: "人事・採用支援",
            url: "/dashboard/referral",
            icon: UserPlus,
        },
        {
            title: "組織の健康度測定・早期対応",
            url: "/dashboard/well-being",
            icon: Heart,
        },
        {
            title: "人材育成・リスキリング",
            url: "/dashboard/reskilling",
            icon: GraduationCap,
        },
        {
            title: "業務自動化・生産性向上",
            url: "/dashboard/automation",
            icon: Bot,
        },
        {
            title: "顧客対応・営業支援",
            url: "/dashboard/support",
            icon: Headset,
        },
        {
            title: "社内向けコンテンツ作成",
            url: "/dashboard/marketing",
            icon: Megaphone,
        },
        {
            title: "需要予測・在庫管理",
            url: "/dashboard/forecast",
            icon: TrendingUp,
        },
        {
            title: "資金繰り・経営支援",
            url: "/dashboard/finance",
            icon: Coins,
        },
        {
            title: "DX・デジタル化推進",
            url: "/dashboard/dx",
            icon: Zap,
        },
        {
            title: "サイバーセキュリティ・リスク管理",
            url: "/dashboard/security",
            icon: ShieldCheck,
        },
        {
            title: "チームビルディング",
            url: "/dashboard/team-building",
            icon: Briefcase,
        },
        {
            title: "Employees",
            url: "/dashboard/employees",
            icon: Users,
        },
        {
            title: "Workflows",
            url: "/dashboard/workflows",
            icon: Workflow,
        },
        {
            title: "Settings",
            url: "/dashboard/settings",
            icon: Settings,
        },
    ];

    return (
        <nav className={`space-y-1 p-4 ${className}`}>
            {navItems.map((item) => (
                <Button
                    key={item.url}
                    variant="ghost"
                    className="w-full justify-start gap-2 text-muted-foreground hover:text-primary"
                    asChild
                    onClick={onLinkClick}
                >
                    <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        {item.title}
                    </Link>
                </Button>
            ))}

            <div className="my-2 border-t" />

            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-primary" asChild onClick={onLinkClick}>
                <Link href="/portal">
                    <ArrowLeft className="h-4 w-4" />
                    ポータルへ戻る
                </Link>
            </Button>
        </nav>
    );
}
