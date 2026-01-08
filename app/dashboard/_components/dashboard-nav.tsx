import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Home,
    Users,
    Workflow,
    Settings,
    Briefcase,
    ArrowLeft,
} from "lucide-react";

interface DashboardNavProps {
    className?: string;
    onLinkClick?: () => void;
}

export function DashboardNav({ className, onLinkClick }: DashboardNavProps) {
    return (
        <nav className={`space-y-1 p-4 ${className}`}>
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-primary" asChild onClick={onLinkClick}>
                <Link href="/dashboard">
                    <Home className="h-4 w-4" />
                    Home
                </Link>
            </Button>

            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-primary" asChild onClick={onLinkClick}>
                <Link href="/dashboard/team-building">
                    <Briefcase className="h-4 w-4" />
                    チームビルディング
                </Link>
            </Button>

            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-primary" asChild onClick={onLinkClick}>
                <Link href="/dashboard/employees">
                    <Users className="h-4 w-4" />
                    Employees
                </Link>
            </Button>

            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-primary" asChild onClick={onLinkClick}>
                <Link href="/dashboard/workflows">
                    <Workflow className="h-4 w-4" />
                    Workflows
                </Link>
            </Button>

            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-primary" asChild onClick={onLinkClick}>
                <Link href="/dashboard/settings">
                    <Settings className="h-4 w-4" />
                    Settings
                </Link>
            </Button>

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
