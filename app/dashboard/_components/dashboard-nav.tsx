"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";
import { DashboardMenuItem } from "@/utils/dashboard-actions";

interface DashboardNavProps {
    className?: string;
    setOpen?: (open: boolean) => void;
    items: DashboardMenuItem[];
    email?: string;
    role?: string;
}

export function DashboardNav({ className, setOpen, items, role }: DashboardNavProps) {
    const pathname = usePathname();

    if (!items?.length) {
        return null;
    }

    return (
        <nav className={cn("grid items-start gap-1 py-2", className)}>
            {items.map((item, index) => {
                // Icon Matching
                const IconComponent = (LucideIcons as any)[item.icon] || LucideIcons.Box;
                const isActive = pathname === item.href;

                return (
                    <div key={index} className="w-full">
                        {item.separator && (
                            <div className="my-2 border-t border-gray-200" />
                        )}
                        <Link
                            href={item.href}
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
                                <IconComponent className="mr-2 h-4 w-4" />
                                <span>{item.title}</span>
                            </span>
                        </Link>
                    </div>
                );
            })}
        </nav>
    );
}