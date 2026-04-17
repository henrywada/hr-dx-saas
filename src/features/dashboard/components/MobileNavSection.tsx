import Link from 'next/link';
import { Briefcase } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth/server-user';
import { APP_ROUTES } from '@/config/routes';
import { MobileLogoutButton } from './MobileLogoutButton';


const linkClass =
  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative text-slate-600 hover:bg-white hover:text-accent-orange hover:shadow-sm';

export async function MobileNavSection() {
  const user = await getServerUser();
  const supabase = await createClient();
  const tenantId = user?.tenant_id;

  let categories: { id: string; name: string; sort_order: number }[] = [];

  if (tenantId) {
    const { data: tenantServices } = await supabase
      .from('tenant_service')
      .select('service_id')
      .eq('tenant_id', tenantId);

    const tenantServiceIds = tenantServices?.map((ts) => ts.service_id) || [];

    if (tenantServiceIds.length > 0) {
      const { data: services } = await supabase
        .from('service')
        .select(`id, service_category:service_category_id(id, name, sort_order)`)
        .eq('target_audience', 'all_users')
        .eq('release_status', '公開')
        .in('id', tenantServiceIds);

      if (services) {
        const categoryMap = new Map<string, { id: string; name: string; sort_order: number }>();
        services.forEach((service) => {
          const category = service.service_category as { id: string; name: string; sort_order: number } | null;
          if (category && !categoryMap.has(category.id)) {
            categoryMap.set(category.id, category);
          }
        });
        categories = Array.from(categoryMap.values()).sort((a, b) => a.sort_order - b.sort_order);
      }
    }
  }

  const basePath = `${APP_ROUTES.TENANT.PORTAL}/subMenu`;

  return (
    <div className="md:hidden mt-1">
      <hr className="border-slate-200 mb-3" />
      <nav className="space-y-1">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`${basePath}?service_category_id=${category.id}`}
            className={linkClass}
          >
            <Briefcase className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
            <span className="flex-1">{category.name}</span>
          </Link>
        ))}
        <MobileLogoutButton />
      </nav>
    </div>
  );
}
