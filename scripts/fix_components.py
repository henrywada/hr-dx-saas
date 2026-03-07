import os

base_path = '/home/hr-dx/ai-projects/hr-dx-saas/src/components/layout'

header_content = """import React from "react";
import Link from "next/link";
import { 
  Bell, 
  Search, 
  Settings, 
  Shield, 
  LogOut, 
  Menu,
  ChevronDown
} from "lucide-react";

interface HeaderProps {
  role?: string;
  userName?: string;
  onMenuClick?: () => void;
}

export function Header({ role = "member", userName = "Guest User", onMenuClick }: HeaderProps) {
  const isEmployee = role === "employee";
  const label = isEmployee ? "従業員" : (role === "admin" ? "管理者" : (role === "supaUser" ? "SaaS管理者" : "メンバー"));
  
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 z-20 shrink-0 sticky top-0 shadow-sm/50">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-slate-100 rounded-md text-slate-500"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <Link href="/top" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B00] to-orange-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">
             <span className="text-white font-bold text-lg tracking-tight">H</span>
          </div>
          <div 
             className="text-xl md:text-2xl font-bold tracking-tighter bg-gradient-to-br from-[#FF6B00] to-orange-600 bg-clip-text text-transparent drop-shadow-sm select-none" 
             style={{ textShadow: "0 1px 1px rgba(0,0,0,0.05)" }}
          >
             HR-dx
          </div>
        </Link>
      </div>

      <div className="flex-1 max-w-xl mx-8 hidden md:block">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent-orange transition-colors" />
          <input 
            type="text" 
            placeholder="機能、従業員、ドキュメントを検索..." 
            className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange/20 focus:border-accent-orange transition-all placeholder:text-slate-400"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
             <span className="text-[10px] font-mono text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">/</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

        {!isEmployee && (
          <div className="hidden md:flex items-center gap-1 mr-2 border-r border-slate-200 pr-4">
            {role === "admin" && (
                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-accent-orange hover:bg-orange-50 rounded-md transition-all">
                  <Settings className="w-4 h-4" />
                  <span>管理へ</span>
                </button>
            )}
            {role === "supaUser" && (
                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all">
                  <Shield className="w-4 h-4" />
                  <span>SaaS管理へ</span>
                </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pl-2 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="text-right hidden md:block leading-tight">
            <div className="text-sm font-semibold text-slate-700">{userName}</div>
            <div className={`text-xs px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${
                role === 'supaUser' ? 'bg-purple-100 text-purple-700' :
                role === 'admin' ? 'bg-orange-100 text-orange-700' :
                'bg-slate-100 text-slate-600'
            }`}>
                {label}
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-bold border-2 border-white shadow-sm">
            {userName.slice(0, 1)}
          </div>
        </div>
      </div>
    </header>
  );
}
"""

sidebar_content = """import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SIDEBAR_MENU } from '@/config/dashboard-config';
import { ChevronRight, ExternalLink } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
      if (path === '/top' && pathname === '/top') return true;
      if (path !== '/top' && pathname?.startsWith(path)) return true;
      return false;
  };

  return (
    <aside className="w-64 bg-slate-50/50 border-r border-slate-200 flex-col hidden md:flex shrink-0">
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        
        {/* Main Navigation */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
            メインメニュー
          </h3>
          <nav className="space-y-1">
            {SIDEBAR_MENU.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link 
                  key={item.label} 
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                    active 
                      ? "bg-white text-accent-orange shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700" 
                      : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                  }`}
                >
                  {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent-orange rounded-r-full"></div>
                  )}
                  <Icon className={`w-5 h-5 transition-colors ${active ? "text-accent-orange" : "text-slate-400 group-hover:text-slate-600"}`} />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight className="w-4 h-4 text-accent-orange opacity-50" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Quick Access / Favorites (Mock) */}
        <div>
           <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3 flex justify-between items-center group cursor-pointer hover:text-slate-600">
             <span>お気に入り</span>
             <span className="opacity-0 group-hover:opacity-100 text-[10px] bg-slate-200 px-1.5 rounded text-slate-600">編集</span>
           </h3>
           <nav className="space-y-1">
              <Link href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all group">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                 <span>給与明細発行</span>
              </Link>
              <Link href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all group">
                 <div className="w-1.5 h-1.5 rounded-full bg-pink-400"></div>
                 <span>年末調整対応</span>
              </Link>
           </nav>
        </div>

        {/* System Status / Announcements */}
        <div className="bg-gradient-to-br from-slate-100 to-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
           <h4 className="font-semibold text-sm text-slate-800 mb-2 flex items-center gap-2">
             <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
             システム稼働中
           </h4>
           <div className="text-xs text-slate-500 space-y-2">
              <p>特に問題は報告されていません。</p>
              <Link href="#" className="text-accent-orange hover:underline flex items-center gap-1 mt-1">
                 ステータス詳細 <ExternalLink className="w-3 h-3" />
              </Link>
           </div>
        </div>

      </div>
      
      {/* User / Bottom Actions */}
      <div className="p-4 border-t border-slate-200">
         <button className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            ヘルプ＆サポート
         </button>
      </div>
    </aside>
  );
}
"""

footer_content = """import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="h-12 bg-white border-t border-slate-200 flex items-center relative px-8 text-xs shrink-0 z-10">
        {/* Left: Links */}
        <div className="flex items-center gap-4 text-slate-500">
            <Link href="#" className="hover:text-accent-orange hover:underline">プライバシーポリシー</Link>
            <Link href="#" className="hover:text-accent-orange hover:underline">利用規約</Link>
        </div>

        {/* Center: Ownership */}
        <div className="absolute left-1/2 -translate-x-1/2 text-slate-400 font-medium">
            &copy; 2026 HR-dx Inc. All rights reserved.
        </div>
        
        {/* Right: Version */}
        <div className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-slate-400 lowercase font-mono">v2.4.1</span>
        </div>
    </footer>
  );
}
"""

os.makedirs(base_path, exist_ok=True)

components = {
    'Header.tsx': header_content,
    'Sidebar.tsx': sidebar_content,
    'Footer.tsx': footer_content
}

for filename, content in components.items():
    path = os.path.join(base_path, filename)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip())
        print(f"Written: {path}")
