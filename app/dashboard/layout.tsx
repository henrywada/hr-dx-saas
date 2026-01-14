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
  LogOut,
  Menu,
} from "lucide-react";
import { Russo_One } from "next/font/google";
import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const logoFont = Russo_One({ weight: "400", subsets: ["latin"] });

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
          <Link href="/dashboard" className={`${logoFont.className} text-2xl bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent drop-shadow-sm`}>
            HR-dx
          </Link>
        </div>
        <DashboardNav className="flex-1" />
      </aside>

      {/* メインコンテンツエリア */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ヘッダー */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
          <div className="flex items-center gap-4 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open sidebar</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <div className="flex h-16 items-center border-b px-6">
                  <Link href="/dashboard" className={`${logoFont.className} text-2xl bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent drop-shadow-sm`}>
                    HR-dx
                  </Link>
                </div>
                {/* Note: In client component for SheetContent we might need to handle closing on click.
                        Common pattern: passing a close function or just relying on link navigation.
                        Since DashboardNav contains Links, navigation will happen but Sheet might stay open?
                        Actually in Next.js App Router, full page reload doesn't happen so Sheet stays open
                        unless we programmatically close it.
                        However, this is a Server Component layout. 
                        To make the Sheet close on navigation, we ideally need a Client Component wrapper.
                        For now, standard usage is acceptable. The user closes it by tapping outside or on X.
                    */}
                <DashboardNav />
              </SheetContent>
            </Sheet>
            <span className={`${logoFont.className} text-2xl bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent drop-shadow-sm`}>HR-dx</span>
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
        <main className="flex-1 overflow-y-auto p-2 md:p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}