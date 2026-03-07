"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ChevronRight, Briefcase, LogOut, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { APP_ROUTES } from '@/config/routes';
import { writeAuditLog } from '@/lib/log/actions';
import { useMobileMenu } from '@/components/layout/MobileMenuContext';

interface SidebarNavProps {
  dynamicCategories: {
    id: string;
    name: string;
    sort_order: number;
  }[];
  tenantName?: string;
  isSaaSAdmin?: boolean;
  basePath?: string;
  userName?: string;
}

export function SidebarNav({ dynamicCategories, tenantName, isSaaSAdmin = false, basePath = `${APP_ROUTES.TENANT.PORTAL}/subMenu`, userName }: SidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileMenu();

  const handleLogoutOrReturn = async () => {
    if (isSaaSAdmin) {
      router.push(APP_ROUTES.TENANT.PORTAL);
    } else {
      await writeAuditLog({ action: "LOGOUT", path: "/logout" }).catch(console.error);
      await supabase.auth.signOut();
      router.push(APP_ROUTES.AUTH.LOGIN);
      router.refresh();
    }
  };

  const dashboardHref = basePath.replace('/subMenu', ''); 
  // "/top/subMenu" -> "/top", "/adm/subMenu" -> "/adm", "/saas_adm/subMenu" -> "/saas_adm"

  const isActive = (path: string, categoryId?: string) => {
      // Logic for top (Dashboard)
      if (path === dashboardHref && pathname === dashboardHref) return true;
      
      // Logic for subMenu using query params
      if (path.includes('subMenu') && categoryId) {
         return pathname === path && searchParams?.get('service_category_id') === categoryId;
      }
      
      // Default prefix match for other paths (if any)
      if (path !== dashboardHref && !path.includes('subMenu') && pathname?.startsWith(path)) return true;
      
      return false;
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-slate-50 md:bg-slate-50/50 border-r border-slate-200 flex-col shrink-0 transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl flex' : '-translate-x-full md:flex hidden'}`}>
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        
        {/* Main Navigation */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
            メインメニュー
          </h3>
          <nav className="space-y-1">
            <Link 
              href={dashboardHref}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                isActive(dashboardHref) 
                  ? "bg-white text-accent-orange shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700" 
                  : "text-slate-600 hover:bg-white hover:text-accent-orange hover:shadow-sm"
              }`}
            >
              {isActive(dashboardHref) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent-orange rounded-r-full"></div>
              )}
              <LayoutDashboard className={`w-5 h-5 transition-colors ${isActive(dashboardHref) ? "text-accent-orange" : "text-slate-400 group-hover:text-slate-600"}`} />
              <span className="flex-1">ダッシュボード</span>
              {isActive(dashboardHref) && <ChevronRight className="w-4 h-4 text-accent-orange opacity-50" />}
            </Link>
          </nav>
        </div>

        {/* Dynamic Business Menu & Logout */}
        <div>
           <nav className="space-y-1">
              {dynamicCategories.length > 0 && dynamicCategories.map((category) => {
                const categoryPath = `${basePath}?service_category_id=${category.id}`; 
                const active = isActive(basePath, category.id);
                
                return (
                  <Link
                    key={category.id}
                    href={categoryPath}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                      active 
                        ? "bg-white text-accent-orange shadow-sm border border-slate-100" 
                        : "text-slate-600 hover:bg-white hover:text-accent-orange hover:shadow-sm"
                    }`}
                  >
                     {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent-orange rounded-r-full"></div>
                    )}
                    <Briefcase className={`w-5 h-5 transition-colors ${active ? "text-accent-orange" : "text-slate-400 group-hover:text-slate-600"}`} />
                    <span className="flex-1">{category.name}</span>
                    {active ? <ChevronRight className="w-4 h-4 text-accent-orange opacity-50" /> : null}
                  </Link>
                );
              })}

              {/* Logout / Return Button */}
              {isSaaSAdmin ? (
                <Link
                  href={APP_ROUTES.TENANT.PORTAL}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative text-slate-600 hover:bg-white hover:text-accent-orange hover:shadow-sm"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                  <span className="flex-1 text-left">ポータルへ戻る</span>
                </Link>
              ) : (
                <button
                  onClick={handleLogoutOrReturn}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative text-slate-600 hover:bg-white hover:text-accent-orange hover:shadow-sm"
                >
                  <LogOut className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                  <span className="flex-1 text-left">ログアウト</span>
                </button>
              )}
              
              {/* Login Tenant Display */}
              {tenantName && (
                 <div className="mt-6 pt-4 border-t border-slate-200 px-2">
                    <p className="text-xs font-semibold text-slate-700 truncate">{tenantName}</p>
                 </div>
              )}
           </nav>
        </div>
      </div>
      
      {/* User / Bottom Actions */}
      <div className="p-4 border-t border-slate-200 bg-white md:bg-transparent">
         {userName && (
           <div className="flex items-center gap-3 mb-4 px-2">
               <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-300">
                   {userName.charAt(0)}
               </div>
               <div className="overflow-hidden">
                   <p className="text-sm font-medium text-slate-700 truncate">{userName}</p>
                   <p className="text-[10px] text-slate-400 truncate">ログイン中</p>
               </div>
           </div>
         )}
         <button className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            ヘルプ＆サポート
         </button>
      </div>
    </aside>
    </>
  );
}
