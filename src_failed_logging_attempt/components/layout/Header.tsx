"use client";

import React from "react";
import Link from "next/link";
import { Bell, LogOut, Menu, Settings, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
  role?: string;
  appRole?: string;
  userName?: string;
  onMenuClick?: () => void;
}

export function Header({ role = "member", appRole, userName = "Guest User", onMenuClick }: HeaderProps) {

  // ラベル表示は引き続き role を使用するか、appRole を優先するか。
  // ここでは従来の role を優先しつつ、appRole があればそれを考慮する形にするが、
  // ユーザー指示はボタンのロジック変更なので、ラベルロジックは既存の role ベースを維持しつつ、
  // appRole があればそれを加味する（例: developer）
  

  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login"); // Redirect to login page
    router.refresh();
  };
  
  // スタイルをオブジェクトとして定義し、確実に適用する
  const headerStyle = {
    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.2)", // より強く、広範囲な影
    zIndex: 50,
    backgroundColor: "rgba(255, 255, 255, 0.95)", // 背景色を少し濃くして透過を減らす（影を際立たせるため）
  };

  return (
    <header 
      style={headerStyle}
      className="h-16 flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 rounded-b-2xl transition-all duration-300 border-b border-slate-100/50 backdrop-blur-md"
    >
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

      <div className="flex items-center gap-3 md:gap-4">
        <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

        <div className="hidden md:flex items-center gap-1 mr-2 border-r border-slate-200 pr-4">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-accent-orange hover:bg-orange-50 rounded-md transition-all"
            >
                  <LogOut className="w-4 h-4" />
                  <span>ログアウト</span>
            </button>
            
            {/* アクションボタン (権限ベース) */}
            <div className="flex items-center gap-3">
              {/* 「管理へ」ボタン: app_role <> 'employee' */}
              {appRole && appRole !== 'employee' && (
                <Link href="/adm">
                  <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-accent-orange hover:bg-orange-50 rounded-md transition-all">
                    <Settings className="w-4 h-4" />
                    <span>管理へ</span>
                  </button>
                </Link>
              )}

              {/* 「SaaS管理へ」ボタン: app_role='developer' or role='supaUser' */}
              {(appRole === 'developer' || role === 'supaUser') && (
                <Link href="/saas_adm">
                  <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all">
                    <Shield className="w-4 h-4" />
                    <span>SaaS管理へ</span>
                  </button>
                </Link>
              )}
            </div>
        </div>

        <div className="flex items-center gap-3 pl-2 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="text-right hidden md:block leading-tight">
            <div className="text-sm font-semibold text-slate-700">{userName}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold border-2 border-white shadow-md ring-1 ring-slate-100">
            {userName.slice(0, 1)}
          </div>
        </div>
      </div>
    </header>
  );
}
