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

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Navigation Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">Team Building</span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">チームビルディング 【Team Building】</h1>
        <div className="flex items-center gap-4 text-muted-foreground mt-2 text-sm">
          <div className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {tenantName}</div>
          <div className="flex items-center gap-1"><User className="h-4 w-4" /> {userName}</div>
        </div>
        <p className="text-muted-foreground mt-4">
          診断から採用、定着まで。組織を強くするための3つのステップ。
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1">
        {/* Card 1: Offer Validator (Diagnosis) */}
        <Link href="/dashboard/team-building/offer-validator" className="group block h-full">
          <Card className="h-full border-2 transition-all duration-200 hover:border-primary/50 hover:shadow-md cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Step 1: 診断
                </Badge>
                {/* Status Icon Example */}
                <Circle className="h-5 w-5 text-gray-300" />
              </div>
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Offer Validator
              </CardTitle>
              <CardDescription className="text-base font-medium text-foreground mt-2">
                「その年収提示、負け戦になっていませんか？」
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                職種と地域を入力するだけで、AIがリアルタイムの求人相場を分析。
                あなたの提示条件がライバル企業と比較して「勝てるオファー」かどうかを数秒で判定します。
              </p>
              <div className="mt-6 flex items-center text-sm font-medium text-primary opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0">
                診断を開始する <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 2: First Recruiter (Attack) */}
        <Link href="/dashboard/team-building/first-recruiter" className="group block h-full">
          <Card className="h-full border-2 transition-all duration-200 hover:border-primary/50 hover:shadow-md cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  Step 2: 獲得
                </Badge>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Mail className="h-5 w-5 text-orange-600" />
                First Recruiter
              </CardTitle>
              <CardDescription className="text-base font-medium text-foreground mt-2">
                「欲しい人材に、"刺さる"手紙を。」
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                候補者の経歴書をコピペするだけ。AIがその人の強みと自社の魅力を結びつけ、
                思わず返信したくなる「1to1のスカウト文面」をあなたに代わって執筆します。
              </p>
              <div className="mt-6 flex items-center text-sm font-medium text-primary opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0">
                スカウトを作成する <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 3: Staff Booster (Reinforce) */}
        <Link href="/dashboard/team-building/staff-booster" className="group block h-full">
          <Card className="h-full border-2 transition-all duration-200 hover:border-primary/50 hover:shadow-md cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Step 3: 増強
                </Badge>
                <Circle className="h-5 w-5 text-gray-300" />
              </div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Staff Booster
              </CardTitle>
              <CardDescription className="text-base font-medium text-foreground mt-2">
                「社員の仕事を減らし、仲間を増やそう。」
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                忙しい社員の「日程調整」や「メール作成」をAIが代行し、業務負荷を軽減。
                生まれた余裕とAIのサポートで、心理的負担ゼロの「自然なリファラル紹介」を実現します。
              </p>
              <div className="mt-6 flex items-center text-sm font-medium text-primary opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0">
                業務代行・紹介依頼へ <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}