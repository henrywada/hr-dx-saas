"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client"; // クライアント用に変更
import { getPortalMenuData } from "@/utils/portal-actions";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PulseChatModal } from "@/components/pulse/PulseChatModal";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Users,
  Activity,
  GraduationCap,
  Zap,
  Headphones,
  Briefcase,
  Heart,
  Building2,
  User,
  Star,
  Mail,
  FileText,
  ShieldCheck,
  Award,
  TrendingUp,
  Smile,
  Globe,
  Anchor,
  Coffee,
  Sun,
  Umbrella,
  ShoppingBag,
  Bell,
  CheckCircle2
} from "lucide-react";

// 1. Icon Mapping for "Category" (Header Icons)
const categoryIconMap: { [key: string]: any } = {
  "人事・採用支援": Users,
  "組織の健康度測定・早期対応": Activity,
  "人材育成・リスキリング": GraduationCap,
  "業務自動化・生産性向上": Zap,
  "顧客対応・営業支援": Headphones,
  "健康経営": Heart,
  "業務支援": Briefcase,
  "チームビルディング": Users,
  "生産性向上": Zap,
};

// 2. Random Icon List
const randomIcons = [
  ShoppingBag, Zap, Activity, Users, Star, ShieldCheck, Award, TrendingUp, Smile, Globe, Anchor, Coffee, Sun, Umbrella, Bell
];

// 3. Color Palettes
const colorPalettes = [
  { border: "border-l-orange-500", hoverBorder: "hover:border-orange-500", text: "text-orange-600", bg: "bg-orange-50", badge: "bg-orange-100 text-orange-700" },
  { border: "border-l-blue-500", hoverBorder: "hover:border-blue-500", text: "text-blue-600", bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700" },
  { border: "border-l-green-500", hoverBorder: "hover:border-green-500", text: "text-green-600", bg: "bg-green-50", badge: "bg-green-100 text-green-700" },
  { border: "border-l-rose-500", hoverBorder: "hover:border-rose-500", text: "text-rose-600", bg: "bg-rose-50", badge: "bg-rose-100 text-rose-700" },
  { border: "border-l-purple-500", hoverBorder: "hover:border-purple-500", text: "text-purple-600", bg: "bg-purple-50", badge: "bg-purple-100 text-purple-700" },
  { border: "border-l-cyan-500", hoverBorder: "hover:border-cyan-500", text: "text-cyan-600", bg: "bg-cyan-50", badge: "bg-cyan-100 text-cyan-700" },
  { border: "border-l-indigo-500", hoverBorder: "hover:border-indigo-500", text: "text-indigo-600", bg: "bg-indigo-50", badge: "bg-indigo-100 text-indigo-700" },
];

const DefaultIcon = Star;

function getHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

function getStyleForService(serviceName: string) {
  const hash = Math.abs(getHash(serviceName));
  const palette = colorPalettes[hash % colorPalettes.length];
  const icon = randomIcons[hash % randomIcons.length];
  return { palette, Icon: icon };
}

export default function PortalPage() {
  const [isPulseOpen, setIsPulseOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initPortal() {
      const supabase = createClient();
      
      // Auth & User Info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: employee } = await supabase
        .from("employees")
        .select(`name, tenants ( name )`)
        .eq("id", user.id)
        .single();

      // @ts-ignore
      const tenantData = employee?.tenants as any;
      const companyName = Array.isArray(tenantData) ? tenantData[0]?.name : tenantData?.name || "登録中の会社";
      const userName = employee?.name || user.email || "Unknown User";

      setUserInfo({ companyName, userName });

      // Fetch Menu Data
      const menuData = await getPortalMenuData();
      setCategories(menuData);
      setLoading(false);
    }
    initPortal();
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground">読み込み中...</div>;
  if (!userInfo) return null;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      
      {/* Title / Welcome Section */}
      <div className="text-center md:text-left pb-0">
        <div className="text-sm text-muted-foreground flex items-center justify-center md:justify-start gap-4 mt-0">
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            <span className="font-medium text-gray-700">{userInfo.companyName}</span>
          </div>
          <div className="text-gray-300">|</div>
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{userInfo.userName}</span>
          </div>
        </div>
      </div>

      {/* Render All Categories */}
      {categories.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">利用可能なサービスがありません。</p>
        </div>
      ) : (
        <div className="space-y-12">
          {categories.map((category) => {
            const HeaderIcon = categoryIconMap[category.name] || DefaultIcon;

            return (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                   <HeaderIcon className="h-6 w-6 text-gray-700" />
                   <h2 className="text-xl font-bold text-gray-800">{category.name}</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {category.services.map((service: any) => {
                     const { palette, Icon: DecoIcon } = getStyleForService(service.name);
                     const MainIcon = service.name.includes("メール") ? Mail : (service.name.includes("診断") ? Activity : FileText);
                     
                     // パルス回答 (Echo) の判定
                     const isPulse = service.name === 'パルス回答 (Echo)';

                     return (
                        <div key={service.name} className="h-full">
                          <Link 
                            href={isPulse ? "#" : service.route_path} 
                            onClick={(e) => {
                              if (isPulse) {
                                e.preventDefault();
                                setIsPulseOpen(true);
                              }
                            }}
                            className="block h-full"
                          >
                            <Card
                              className={cn(
                                "group relative h-full bg-white overflow-hidden transition-all duration-300",
                                "shadow-md hover:shadow-xl hover:-translate-y-1",
                                "border border-transparent border-l-4 border-solid p-4",
                                palette.border,
                                palette.hoverBorder
                              )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={cn(
                                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                                        palette.badge
                                    )}>
                                        {service.category || service.badge_text || category.name}
                                    </span>
                                    <DecoIcon className={cn("h-5 w-5 opacity-80", palette.text)} />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <MainIcon className={cn("h-5 w-5", palette.text)} />
                                        <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                            {service.name}
                                        </h3>
                                    </div>

                                    {service.title && (
                                        <div className="w-full text-center">
                                            <p className="text-sm font-bold text-gray-900 leading-snug">
                                                「{service.title}」
                                            </p>
                                        </div>
                                    )}

                                    <div className="mt-3">
                                        <p className="text-sm text-muted-foreground leading-snug line-clamp-3">
                                            {service.description}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                          </Link>
                        </div>
                     );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* パルス回答用モーダル */}
      <PulseChatModal 
        isOpen={isPulseOpen} 
        onClose={() => setIsPulseOpen(false)} 
      />
    </div>
  );
}
