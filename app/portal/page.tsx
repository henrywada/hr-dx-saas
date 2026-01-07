import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Heart, Briefcase, Zap, Settings, LogOut, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { logout } from "@/app/auth/actions";

export default async function PortalPage() {
    const supabase = await createClient();

    // 1. 認証チェック
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    // 2. 権限チェック (employeesテーブルからRoleを取得)
    const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("role")
        .eq("id", user.id)
        .single();

    const isAdminOrManager = employee && employee.role !== "employee";

    // カードデータ定義
    const services = [
        {
            title: "Well-Being",
            description: "労務リスク検知・メンタルヘルス Agent。従業員の心身の状態を継続的にモニタリングし、早期のアラート発信やケアプランの提案を行います。",
            badge: "Step 1: メンタルヘルス",
            icon: Heart,
            color: "text-rose-600",
            borderColor: "border-l-rose-500",
            hoverBorderColor: "hover:border-rose-500",
            badgeVariant: "bg-rose-50 text-rose-600 hover:bg-rose-50 border-none",
        },
        {
            title: "Work Support",
            description: "入社オンボーディング & SOP化 Agent。煩雑な入社手続きの自動化や、業務プロセスの標準化・マニュアル化を支援します。",
            badge: "Step 2: 業務支援",
            icon: Briefcase,
            color: "text-blue-600",
            borderColor: "border-l-blue-500",
            hoverBorderColor: "hover:border-blue-500",
            badgeVariant: "bg-blue-50 text-blue-600 hover:bg-blue-50 border-none",
        },
        {
            title: "Team Building",
            description: "採用スカウト特化型 Agent。組織のカルチャーにマッチした人材の発掘から、チーム編成の最適化までをサポートします。",
            badge: "Step 3: 組織強化",
            icon: Users,
            color: "text-green-600",
            borderColor: "border-l-green-500",
            hoverBorderColor: "hover:border-green-500",
            badgeVariant: "bg-green-50 text-green-600 hover:bg-green-50 border-none",
        },
        {
            title: "Work Efficiency",
            description: "業務効率化 Agent。日常の定型業務をAIが代行・効率化し、従業員がより創造的な業務に集中できる環境を整えます。",
            badge: "Step 4: 生産性向上",
            icon: Zap,
            color: "text-orange-600",
            borderColor: "border-l-orange-500",
            hoverBorderColor: "hover:border-orange-500",
            badgeVariant: "bg-orange-50 text-orange-600 hover:bg-orange-50 border-none",
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10 w-full shadow-sm">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div>
                        <span className="text-2xl font-bold text-orange-500 tracking-tight">
                            HR-DX SaaS
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <form action={logout}>
                            <Button variant="outline" size="sm" className="gap-2 h-9">
                                <LogOut className="h-4 w-4" />
                                ログアウト
                            </Button>
                        </form>

                        {isAdminOrManager && (
                            <Button asChild variant="default" size="sm" className="gap-2 h-9 bg-gray-900 hover:bg-gray-800 text-white">
                                <Link href="/dashboard/employees">
                                    <Settings className="h-4 w-4" />
                                    管理画面へ
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-6 py-8">
                {/* Title Section */}
                <div className="mb-10 text-center md:text-left">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        人事DX ポータル
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        組織を強くするための統合プラットフォーム
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    {services.map((service) => (
                        <Card
                            key={service.title}
                            className={cn(
                                "group relative shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer bg-white overflow-hidden",
                                // Border styles: default left border, hover full border
                                "border-0 border-l-4 border-solid",
                                // On hover, keep left border width (and color if not overridden), and add border to other sides
                                // Note: hover:border adds border-width: 1px to all sides.
                                "hover:border",
                                service.borderColor,
                                service.hoverBorderColor
                            )}
                        >
                            <CardHeader className="pb-3 md:pb-4 space-y-4">
                                <Badge
                                    className={cn(
                                        "rounded-full px-3 py-1 text-xs font-medium w-fit shadow-none",
                                        service.badgeVariant
                                    )}
                                >
                                    {service.badge}
                                </Badge>

                                <div className="flex items-start justify-between">
                                    <CardTitle className="text-xl font-bold text-gray-900">
                                        {service.title}
                                    </CardTitle>
                                    <div className={cn("p-2 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors", service.color)}>
                                        <service.icon className="h-6 w-6" />
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent>
                                <CardDescription className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                                    {service.description}
                                </CardDescription>

                                {/* Reveal Text */}
                                <div className={cn(
                                    "mt-4 flex items-center font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300",
                                    service.color
                                )}>
                                    サービスへ移動 <ArrowRight className="ml-2 h-4 w-4" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </main>
        </div>
    );
}
