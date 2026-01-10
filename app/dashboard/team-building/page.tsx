import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ArrowRight, TrendingUp, Mail, Users, Building2, User } from "lucide-react";

export default async function TeamBuildingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 社員データとテナントデータを取得
  const { data: employee } = await supabase
    .from("employees")
    .select("*, tenants(name)")
    .eq("id", user.id)
    .single();

  const tenantName = employee?.tenants?.name || "Unknown Company";
  const userName = employee?.name || user.email || "Unknown User";

  const steps = [
    {
      id: 'offer-validator',
      step: 'Offer Validator', // 旧: Step 1: 診断
      title: 'オファー妥当性診断', // 旧: Offer Validator
      description: '「その年収提示、負け戦になっていませんか？」',
      detail: '「職種・エリア・年収」を入力するだけで、AIが最新の市場相場と照合し、オファーの競争力を分析。提示条件の「妥当性判定」に加え、具体的な改善アドバイスと、ターゲット獲得に最も効果的な「推奨求人メディアTOP5」まで提案します。',
      status: 'ready',
      href: '/dashboard/team-building/offer-validator',
      color: 'blue',
      icon: TrendingUp,
      statusIcon: Circle,
    },
    {
      id: 'first-recruiter',
      step: 'First Recruiter', // 旧: Step 2: 獲得
      title: '採用メール自動生成', // 旧: First Recruiter
      description: '「欲しい人材に、"刺さる"手紙を。」',
      detail: '候補者の経歴書をコピペするだけ。AIがその人の強みと自社の魅力を結びつけ、思わず返信したくなる「1to1のスカウト文面」をあなたに代わって執筆します。',
      status: 'completed',
      href: '/dashboard/team-building/first-recruiter',
      color: 'orange',
      icon: Mail,
      statusIcon: CheckCircle2,
    },
    {
      id: 'staff-booster',
      step: 'Staff Booster', // 旧: Step 3: 増強
      title: '社員増力化 & リファラル支援', // 旧: Staff Booster
      description: '「社員の仕事を減らし、仲間を増やそう。」',
      detail: '忙しい社員の「日程調整」や「メール作成」をAIが代行し、業務負荷を軽減。生まれた余裕とAIのサポートで、心理的負担ゼロの「自然なリファラル紹介」を実現します。',
      status: 'pending',
      href: '/dashboard/team-building/staff-booster',
      color: 'emerald',
      icon: Users,
      statusIcon: Circle,
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bar: 'bg-blue-500',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: 'text-blue-600',
          hoverBorder: 'hover:border-blue-500/50',
        };
      case 'orange':
        return {
          bar: 'bg-orange-500',
          badge: 'bg-orange-50 text-orange-700 border-orange-200',
          icon: 'text-orange-600',
          hoverBorder: 'hover:border-orange-500/50',
        };
      case 'emerald':
        return {
          bar: 'bg-emerald-500',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: 'text-emerald-600',
          hoverBorder: 'hover:border-emerald-500/50',
        };
      default:
        return {
          bar: 'bg-primary',
          badge: 'bg-primary/10 text-primary border-primary/20',
          icon: 'text-primary',
          hoverBorder: 'hover:border-primary/50',
        };
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Navigation Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">人事・採用支援</span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">人事・採用支援</h1>
        <div className="flex items-center gap-4 text-muted-foreground mt-2 text-sm">
          <div className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {tenantName}</div>
          <div className="flex items-center gap-1"><User className="h-4 w-4" /> {userName}</div>
        </div>
        <p className="text-muted-foreground mt-4">
          診断から採用、定着まで。組織を強くするための3つのステップ。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {steps.map((step) => {
          const colors = getColorClasses(step.color);
          const Icon = step.icon;
          const StatusIcon = step.statusIcon;

          return (
            <Link key={step.id} href={step.href} className="group block h-full">
              <Card className={`h-full border-2 transition-all duration-200 hover:shadow-md cursor-pointer relative overflow-hidden ${colors.hoverBorder}`}>
                <div className={`absolute top-0 left-0 w-1 h-full ${colors.bar}`} />
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className={colors.badge}>
                      {step.step}
                    </Badge>
                    <StatusIcon className={`h-5 w-5 ${step.status === 'completed' ? 'text-green-500' : 'text-gray-300'}`} />
                  </div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${colors.icon}`} />
                    {step.title}
                  </CardTitle>
                  <CardDescription className="text-base font-medium text-foreground mt-2">
                    {step.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.detail}
                  </p>
                  <div className="mt-6 flex items-center text-sm font-medium text-primary opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0">
                    詳細を見る <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}