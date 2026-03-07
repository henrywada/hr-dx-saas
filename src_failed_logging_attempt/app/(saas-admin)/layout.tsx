
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header_adm_saas";
import { Sidebar } from "@/components/layout/Sidebar_adm_saas";
import { Footer } from "@/components/layout/Footer";

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userName = user?.user_metadata?.name || "Guest User";
  // Default to supaUser if accessing this route, or fetch from role.
  // Ideally check role strictly.
  const role = user?.user_metadata?.role || "supaUser"; 

  // 背景色を強制するためのスタイル
  const bgStyle = { backgroundColor: "#E5EBFF" };

  return (
    <div className="flex flex-col h-screen font-sans text-slate-900 overflow-hidden" style={bgStyle}>
      {/* Header (Sticky or Fixed if needed, currently part of flex flow) */}
      <Header role={role} userName={userName} />

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden" style={bgStyle}>
        {/* Left Sidebar (Fixed width) */}
        <Sidebar />

        {/* Main Content (Flexible width, Scrollable) */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative" style={bgStyle}>
          {/* Scrollable Content Region */}
          <div className="flex-1 overflow-y-auto scroll-smooth">
             {/* Page Content */}
             <div className="p-6 md:p-8 max-w-full mx-auto w-full">
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