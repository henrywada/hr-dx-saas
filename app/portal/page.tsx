import { createClient } from "@/utils/supabase/server";
import { getPortalMenuData, PortalService } from "@/utils/portal-actions";
import Link from "next/link";
import { cn } from "@/lib/utils";
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

export default async function PortalPage() {
  const supabase = await createClient();

  // 1. Auth & User Info
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null; 

  const { data: employee } = await supabase
    .from("employees")
    .select(`
      name,
      tenants (
        name
      )
    `)
    .eq("id", user.id)
    .single();

  // @ts-ignore
  const tenantData = employee?.tenants as any;
  const companyName = Array.isArray(tenantData)
    ? tenantData[0]?.name
    : tenantData?.name || "登録中の会社";

  const userName = employee?.name || user.email || "Unknown User";

  // 2. Fetch Menu Data
  const categories = await getPortalMenuData();

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      
      {/* Title / Welcome Section */}
      <div className="text-center md:text-left pb-0">
        <div className="text-sm text-muted-foreground flex items-center justify-center md:justify-start gap-4 mt-0">
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            <span className="font-medium text-gray-700">{companyName}</span>
          </div>
          <div className="text-gray-300">|</div>
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{userName}</span>
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
                  {category.services.map((service) => {
                     const { palette, Icon: DecoIcon } = getStyleForService(service.name);
                     const MainIcon = service.name.includes("メール") ? Mail : (service.name.includes("診断") ? Activity : FileText);

                     return (
                        <Link key={service.name} href={service.route_path} className="block h-full">
                          <Card
                            className={cn(
                              "group relative h-full bg-white overflow-hidden transition-all duration-300",
                              "shadow-md hover:shadow-xl hover:-translate-y-1", // Enhanced 3D shadow + lift
                              "border border-transparent border-l-4 border-solid p-4", // 1px transparent border (except left)
                              palette.border,
                              palette.hoverBorder // Colorize border on hover
                            )}
                          >
                              {/* Top Row: Badge (Left) & Deco Icon (Right) */}
                              <div className="flex justify-between items-start mb-1">
                                  {/* Category Badge */}
                                  <span className={cn(
                                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium",
                                      palette.badge
                                  )}>
                                      {service.category || service.badge_text || category.name}
                                  </span>
                                  
                                  {/* Decorative Icon */}
                                  <DecoIcon className={cn("h-5 w-5 opacity-80", palette.text)} />
                              </div>

                              {/* Content Stack */}
                              <div className="flex flex-col gap-1">
                                  {/* Service Name Row */}
                                  <div className="flex items-center gap-2">
                                      <MainIcon className={cn("h-5 w-5", palette.text)} />
                                      <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                          {service.name}
                                      </h3>
                                  </div>

                                  {/* Title (Catchphrase) */}
                                  {service.title && (
                                      <div className="w-full text-center"> {/* Center Align Title */}
                                          <p className="text-sm font-bold text-gray-900 leading-snug">
                                              「{service.title}」
                                          </p>
                                      </div>
                                  )}

                                  {/* Description */}
                                  <div className="mt-3"> {/* Increased gap for visual separation */}
                                      <p className="text-sm text-muted-foreground leading-snug line-clamp-3">
                                          {service.description}
                                      </p>
                                  </div>
                              </div>

                          </Card>
                        </Link>
                     );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}