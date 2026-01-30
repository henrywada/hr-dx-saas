"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Activity,
  GraduationCap,
  Zap,
  Headphones,
  Settings,
  Briefcase,
  Heart,
  FileText,
  Star,
} from "lucide-react";
import { PortalCategory } from "@/utils/portal-actions";

// Icon mapping based on category names (or fallbacks)
// This maps the DB 'name' to Lucide icons
const iconMap: { [key: string]: any } = {
  "人事・採用支援": Users,
  "組織の健康度測定・早期対応": Activity, // or Heart
  "人材育成・リスキリング": GraduationCap,
  "業務自動化・生産性向上": Zap,
  "顧客対応・営業支援": Headphones,
  "健康経営": Heart,
  "業務支援": Briefcase,
  "チームビルディング": Users,
  "生産性向上": Zap,
};

// Fallback icon
const DefaultIcon = Star;

interface PortalSidebarProps {
  categories: PortalCategory[];
  className?: string;
  setOpen?: (open: boolean) => void;
}

export function PortalSidebar({ categories, className, setOpen }: PortalSidebarProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("grid items-start gap-1 py-2", className)}>
      {/* Home Link */}
      <div className="w-full">
        <Link
          href="/portal"
          onClick={() => {
            if (setOpen) setOpen(false);
          }}
        >
          <span
            className={cn(
              "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
              pathname === "/portal" ? "bg-accent text-accent-foreground" : "transparent"
            )}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Home</span>
          </span>
        </Link>
      </div>

      <div className="my-2 border-t border-gray-200" />

      {/* Dynamic Categories */}
      {categories.map((cat) => {
        const Icon = iconMap[cat.name] || DefaultIcon;
        const href = `/portal/services/${cat.id}`;
        // Active if exact match or sub-route (though services lists are usually exact)
        const isActive = pathname === href;

        return (
          <div key={cat.id} className="w-full">
            <Link
              href={href}
              onClick={() => {
                if (setOpen) setOpen(false);
              }}
            >
              <span
                className={cn(
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                  isActive ? "bg-accent text-accent-foreground" : "transparent"
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{cat.name}</span>
              </span>
            </Link>
          </div>
        );
      })}


    </nav>
  );
}
