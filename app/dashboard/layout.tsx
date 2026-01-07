import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Home,
  LogOut,
  Settings,
  Users,
  Workflow,
  Briefcase, // Team Building用に追加
} from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/auth/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // 社員データとテナントデータを取得
  const { data: employee } = await supabase
    .from("employees")
    .select("*, tenants(*)")
    .eq("id", user.id)
    .single();

  const tenantName = employee?.tenants?.name || "Unknown Organization";
  const employeeName = employee?.name || user.email || "Guest";

  return (
    <div className="flex h-screen w-full bg-gray-50">
      {/* サイドバー (PC表示時のみ) */}
      <aside className="hidden w-64 flex-col border-r bg-white md:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="text-xl font-bold tracking-tight text-primary">
            HR-DX SaaS
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-primary" asChild>
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              Home
            </Link>
          </Button>
          
          {/* 今回追加する Team Building メニュー */}
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-primary" asChild>
            <Link href="/dashboard/team-building">
              <Briefcase className="h-4 w-4" />
              Team Building
            </Link>
          </Button>

          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-primary" asChild>
            <Link href="/dashboard/employees">
              <Users className="h-4 w-4" />
              Employees
            </Link>
          </Button>

          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-primary">
            <Workflow className="h-4 w-4" />
            Workflows
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-primary">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </nav>
      </aside>

      {/* メインコンテンツエリア */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ヘッダー */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
          <div className="flex items-center gap-4 md:hidden">
             {/* モバイル用メニューなどは一旦省略 */}
             <span className="font-bold text-primary">HR-DX SaaS</span>
          </div>
          <div className="flex flex-1 items-center justify-end gap-4">
            <div className="mr-2 hidden flex-col items-end md:flex">
              <span className="text-sm font-medium text-foreground">{employeeName}</span>
              <span className="text-xs text-muted-foreground">{tenantName}</span>
            </div>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground">
              <Bell className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="/placeholder-avatar.jpg" alt="@user" />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {employeeName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{employeeName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <form action={logout} className="w-full cursor-pointer">
                        <button type="submit" className="flex w-full items-center">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </button>
                    </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ページごとのコンテンツがここに入ります */}
        <main className="flex-1 overflow-y-auto p-8 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}