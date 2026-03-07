import { createClient } from '@/lib/supabase/server';
import type { StressCheckPeriod } from '@/features/stress-check/types';

export async function getStressCheckPeriodsList(tenantId: string): Promise<StressCheckPeriod[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('stress_check_periods')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getStressCheckPeriodsList error:', error);
    return [];
  }

  return (data || []) as StressCheckPeriod[];
}
