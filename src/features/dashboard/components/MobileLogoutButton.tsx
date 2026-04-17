'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { APP_ROUTES } from '@/config/routes';
import { writeAuditLog } from '@/lib/log/actions';

const linkClass =
  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative text-slate-600 hover:bg-white hover:text-accent-orange hover:shadow-sm';

export function MobileLogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await writeAuditLog({ action: 'LOGOUT', path: '/logout' }).catch(console.error);
    await supabase.auth.signOut();
    router.push(APP_ROUTES.AUTH.LOGIN);
    router.refresh();
  };

  return (
    <button onClick={handleLogout} className={linkClass}>
      <LogOut className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
      <span className="flex-1 text-left">ログアウト</span>
    </button>
  );
}
