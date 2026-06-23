'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { writeAuditLog } from '@/lib/log/actions';
import { APP_ROUTES } from '@/config/routes';
import { Stethoscope, LogOut } from 'lucide-react';

export function CompanyDoctorHeader() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await writeAuditLog({ action: 'LOGOUT', path: '/logout' }).catch(console.error);
    await supabase.auth.signOut();
    router.push(APP_ROUTES.AUTH.LOGIN);
    router.refresh();
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 mb-4 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-center gap-2">
        <Stethoscope className="w-5 h-5 text-blue-600" />
        <h2 className="text-base font-bold text-slate-800">
          産業医・保健師専用エリア
        </h2>
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
      >
        <LogOut className="w-4 h-4" />
        ログアウト
      </button>
    </div>
  );
}
