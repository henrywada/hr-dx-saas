
import React from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { createClient } from "@/lib/supabase/server";

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userName = "Guest User";
  let role = "member";
  let appRole: string | undefined;

  if (user) {
    if (user.user_metadata?.name) {
      userName = user.user_metadata.name;
    }
    // SupaUser判定 (metadata or email check etc. ここではmetadata.roleを優先)
    if (user.user_metadata?.role === 'supaUser') {
      role = 'supaUser';
    }

    // Employeesテーブルから情報取得
    const { data: employee } = await supabase
      .from('employees')
      // app_roleテーブルをjoinしてapp_roleカラムを取得
      .select('name, app_role:app_role_id(app_role)') 
      .eq('user_id', user.id)
      .single();
    
    if (employee) {
       userName = employee.name;
       // joinしたデータの型は { app_role: { app_role: string } } もしくは null
       const distinctRole = employee.app_role as any; 
       if (distinctRole?.app_role) {
          appRole = distinctRole.app_role;
       }
    }
  }

  // 背景色を強制するためのスタイル
  const bgStyle = { backgroundColor: "#F9FAFB" };

  return (
    <div className="flex flex-col h-screen font-sans text-slate-900 overflow-hidden" style={bgStyle}>
      {/* Header */}
      <Header role={role} appRole={appRole} userName={userName} />

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden" style={bgStyle}>
        {/* Left Sidebar (Fixed width) */}
        <Sidebar />

        {/* Main Content (Flexible width, Scrollable) */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative" style={bgStyle}>
          {/* Scrollable Content Region */}
          <div className="flex-1 overflow-y-auto scroll-smooth">
             {/* Page Content */}
             <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
                {children}
             </div>
          </div>
          
          {/* Footer at the bottom of Main area */}
          <Footer />
        </main>
      </div>
    </div>
  );
}